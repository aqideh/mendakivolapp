(() => {
  let warnings = [];
  let loading = false;
  let lastError = '';

  const qs = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => window.VolunteerDataStore?.utils?.escapeHtml?.(value) || String(value ?? '');

  function store() { return window.VolunteerDataStore; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function signedIn() { return Boolean(store()?.getSession?.()?.email); }

  function formatDate(value) {
    if (!value) return 'Not scheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-SG', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  function ensureCard() {
    if (!isAdmin()) return null;
    const layout = qs('.dashboard-layout');
    if (!layout || qs('[data-session-attendance-validation-card]')) return qs('[data-session-attendance-validation-card]');
    const card = document.createElement('section');
    card.className = 'dashboard-card session-attendance-validation-card';
    card.dataset.sessionAttendanceValidationCard = 'true';
    card.dataset.dashboardCardRole = 'admin';
    card.innerHTML = renderCardBody();
    const audit = qs('[data-audit-history-card]');
    if (audit) audit.insertAdjacentElement('afterend', card);
    else layout.append(card);
    return card;
  }

  function renderWarning(row) {
    const title = row.session_title || row.session_id || 'Opportunity session';
    const meta = `${row.opportunity_id || 'unknown opportunity'} · ${formatDate(row.starts_at)} · ${row.status || 'status unset'}`;
    return `
      <div class="admin-content-item">
        <span>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(meta)}</span>
          <span>${escapeHtml(row.warning || 'Session facilitator code is missing.')}</span>
        </span>
      </div>
    `;
  }

  function renderCardBody() {
    if (!isAdmin()) return '';
    const missing = warnings.filter(item => item.has_session_code === false || item.has_session_code === 'false');
    return `
      <div class="section-header">
        <div>
          <p class="eyebrow dark">Admin</p>
          <h2>Session attendance validation</h2>
          <p class="dashboard-muted">Session-specific facilitator codes are now preferred for attendance check-in/out.</p>
        </div>
        <button class="text-button" type="button" data-session-code-warning-refresh>${loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      ${lastError ? `<p class="dashboard-muted error">${escapeHtml(lastError)}</p>` : ''}
      <div class="dashboard-stat-grid">
        <div class="dashboard-stat"><strong>${escapeHtml(warnings.length)}</strong><span>Open sessions checked</span></div>
        <div class="dashboard-stat"><strong>${escapeHtml(missing.length)}</strong><span>Missing session code</span></div>
      </div>
      <p class="dashboard-muted">Sessions without a facilitator code may fall back to the opportunity-level code only when fallback is allowed.</p>
      <div class="admin-content-list page-list">
        ${missing.length ? missing.map(renderWarning).join('') : '<div class="admin-content-item"><span>All loaded open sessions have session facilitator codes.</span></div>'}
      </div>
    `;
  }

  function render() {
    const card = ensureCard();
    if (card) card.innerHTML = renderCardBody();
  }

  async function sync() {
    if (!signedIn() || !isAdmin()) return;
    loading = true;
    lastError = '';
    render();
    try {
      warnings = await store()?.fetchSessionCodeWarnings?.() || [];
    } catch (error) {
      lastError = error.message || 'Could not load session code warnings.';
      warnings = [];
    } finally {
      loading = false;
      render();
    }
  }

  function bind() {
    if (window.__sessionAttendanceValidationBound) return;
    window.__sessionAttendanceValidationBound = true;
    document.addEventListener('click', event => {
      if (event.target.closest('[data-session-code-warning-refresh]')) sync();
    }, true);
  }

  window.MENDAKISessionAttendanceValidation = { sync, render };

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    window.setTimeout(sync, 2000);
  });
  window.addEventListener('volunteer-auth-ready', sync);
  window.addEventListener('volunteer-auth-changed', sync);
  window.addEventListener('volunteer-opportunity-sessions-synced', sync);
})();
