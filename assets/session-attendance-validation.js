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

  function retireStandaloneCard() {
    qs('[data-session-attendance-validation-card]')?.remove();
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

  function renderPanelBody() {
    if (!isAdmin()) return '';
    const missing = warnings.filter(item => item.has_session_code === false || item.has_session_code === 'false');
    return `
      <section class="phase36-table-card" data-session-attendance-validation-panel>
        <div class="phase36-table-head">
          <div>
            <h4>Session attendance validation</h4>
            <p class="dashboard-muted">Session-specific facilitator codes are preferred for attendance check-in/out.</p>
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
      </section>
    `;
  }

  function renderInto(host) {
    retireStandaloneCard();
    if (!host || !isAdmin()) return false;
    host.insertAdjacentHTML('beforeend', renderPanelBody());
    return true;
  }

  function render() {
    retireStandaloneCard();
    const panel = qs('[data-session-attendance-validation-panel]');
    if (panel) panel.outerHTML = renderPanelBody();
  }

  async function sync(options = {}) {
    if (!signedIn() || !isAdmin()) {
      retireStandaloneCard();
      return [];
    }
    loading = true;
    lastError = '';
    if (options.render !== false) render();
    try {
      warnings = await store()?.fetchSessionCodeWarnings?.() || [];
    } catch (error) {
      lastError = error.message || 'Could not load session code warnings.';
      warnings = [];
    } finally {
      loading = false;
      if (options.render !== false) render();
    }
    return warnings.slice();
  }

  function bind() {
    if (window.__sessionAttendanceValidationBound) return;
    window.__sessionAttendanceValidationBound = true;
    document.addEventListener('click', event => {
      if (event.target.closest('[data-session-code-warning-refresh]')) sync();
    }, true);
  }

  window.MENDAKISessionAttendanceValidation = {
    sync,
    render,
    renderInto,
    getWarnings: () => warnings.slice()
  };

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    retireStandaloneCard();
    window.setTimeout(() => sync({ render: false }), 2000);
  });
  window.addEventListener('volunteer-auth-ready', () => sync({ render: false }));
  window.addEventListener('volunteer-auth-changed', () => sync({ render: false }));
  window.addEventListener('volunteer-opportunity-sessions-synced', () => sync({ render: false }));
})();
