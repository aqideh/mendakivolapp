(() => {
  let rows = [];
  let options = { action_types: [], entity_types: [] };
  let loading = false;
  let lastError = '';
  let selectedId = '';

  const qs = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => window.VolunteerDataStore?.utils?.escapeHtml?.(value) || String(value ?? '');

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }

  function ensureCard() {
    if (!isAdmin()) return null;
    const layout = qs('.dashboard-layout');
    if (!layout || qs('[data-audit-history-card]')) return qs('[data-audit-history-card]');
    const card = document.createElement('section');
    card.className = 'dashboard-card audit-history-card';
    card.dataset.auditHistoryCard = 'true';
    card.dataset.dashboardCardRole = 'admin';
    card.innerHTML = renderCardBody();
    const reports = qs('[data-reports-card]');
    if (reports) reports.insertAdjacentElement('afterend', card);
    else layout.append(card);
    return card;
  }

  function formValue(name) {
    return String(qs(`[data-audit-filter="${name}"]`)?.value || '').trim();
  }

  function rpcArgs() {
    return {
      p_start_date: formValue('startDate') || null,
      p_end_date: formValue('endDate') || null,
      p_action_type: formValue('actionType') || null,
      p_actor: formValue('actor') || null,
      p_entity_type: formValue('entityType') || null,
      p_target: formValue('target') || null,
      p_limit: Number(formValue('limit') || 100)
    };
  }

  async function fetchOptions() {
    const supabase = client();
    if (!supabase || !isAdmin()) return;
    try {
      const { data, error } = await supabase.rpc('get_admin_audit_filter_options');
      if (error) throw error;
      options = data || { action_types: [], entity_types: [] };
    } catch (error) {
      console.warn('Could not load audit filter options.', error);
    }
  }

  async function runAuditSearch() {
    const supabase = client();
    if (!supabase || !isAdmin()) return;
    loading = true;
    lastError = '';
    render();
    try {
      await fetchOptions();
      const { data, error } = await supabase.rpc('get_admin_audit_logs', rpcArgs());
      if (error) throw error;
      rows = Array.isArray(data) ? data : [];
      if (selectedId && !rows.some(row => row.id === selectedId)) selectedId = '';
    } catch (error) {
      rows = [];
      selectedId = '';
      lastError = error.message || 'Could not load audit history.';
      console.warn('Audit history failed.', error);
    } finally {
      loading = false;
      render();
    }
  }

  function selectedRow() {
    return rows.find(row => row.id === selectedId) || null;
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-SG', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  function renderCardBody() {
    if (!isAdmin()) return '';
    return `
      <div class="section-header">
        <div>
          <p class="eyebrow dark">Admin</p>
          <h2>Audit history</h2>
          <p class="dashboard-muted">Review immutable admin/system events and inspect metadata.</p>
        </div>
        <button class="text-button" type="button" data-audit-run>${loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      <form class="profile-form audit-filter-form" data-audit-form>
        <div class="session-form-row">
          <label>Start date<input type="date" data-audit-filter="startDate"></label>
          <label>End date<input type="date" data-audit-filter="endDate"></label>
        </div>
        <div class="session-form-row">
          <label>Action type${renderSelect('actionType', options.action_types || [], 'Any action')}</label>
          <label>Entity type${renderSelect('entityType', options.entity_types || [], 'Any entity')}</label>
        </div>
        <div class="session-form-row">
          <label>Actor email<input data-audit-filter="actor" placeholder="Optional actor email"></label>
          <label>Target email<input data-audit-filter="target" placeholder="Optional target email"></label>
        </div>
        <label>Limit
          <select data-audit-filter="limit">
            <option value="50">50 rows</option>
            <option value="100" selected>100 rows</option>
            <option value="250">250 rows</option>
            <option value="500">500 rows</option>
          </select>
        </label>
        <div class="dashboard-actions">
          <button class="button button-primary" type="submit">Search audit history</button>
          <button class="button dashboard-secondary" type="button" data-audit-export ${rows.length ? '' : 'disabled'}>Export CSV</button>
        </div>
      </form>
      ${lastError ? `<p class="dashboard-muted error">${escapeHtml(lastError)}</p>` : ''}
      <p class="dashboard-muted">${escapeHtml(rows.length)} audit row${rows.length === 1 ? '' : 's'} loaded.</p>
      <div class="audit-history-grid">
        <div class="admin-content-list page-list audit-history-list">
          ${rows.length ? rows.map(renderAuditRow).join('') : '<div class="admin-content-item"><span>No audit rows loaded yet.</span></div>'}
        </div>
        ${renderDetailsDrawer()}
      </div>
    `;
  }

  function renderSelect(name, values, emptyLabel) {
    return `
      <select data-audit-filter="${escapeHtml(name)}">
        <option value="">${escapeHtml(emptyLabel)}</option>
        ${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}
      </select>
    `;
  }

  function renderAuditRow(row) {
    const active = row.id === selectedId ? ' active' : '';
    const title = `${row.action_type || 'Action'} · ${row.entity_type || 'Entity'}`;
    const meta = `${row.actor_email || 'Unknown actor'}${row.target_email ? ` → ${row.target_email}` : ''} · ${formatDate(row.created_at)}`;
    return `
      <button class="admin-content-item editable audit-history-row${active}" type="button" data-audit-select="${escapeHtml(row.id)}">
        <span>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(meta)}</span>
          ${row.summary ? `<span>${escapeHtml(row.summary)}</span>` : ''}
        </span>
      </button>
    `;
  }

  function renderDetailsDrawer() {
    const row = selectedRow();
    if (!row) {
      return '<aside class="audit-details"><h3>Details</h3><p class="dashboard-muted">Select an audit row to inspect metadata.</p></aside>';
    }
    return `
      <aside class="audit-details">
        <div class="section-header compact">
          <div>
            <h3>Audit details</h3>
            <p class="dashboard-muted">${escapeHtml(formatDate(row.created_at))}</p>
          </div>
        </div>
        <dl class="audit-detail-list">
          <dt>Action</dt><dd>${escapeHtml(row.action_type)}</dd>
          <dt>Entity</dt><dd>${escapeHtml(row.entity_type)}${row.entity_id ? ` · ${escapeHtml(row.entity_id)}` : ''}</dd>
          <dt>Actor</dt><dd>${escapeHtml(row.actor_email || 'Unknown')}</dd>
          <dt>Target</dt><dd>${escapeHtml(row.target_email || 'None')}</dd>
          <dt>Summary</dt><dd>${escapeHtml(row.summary || 'No summary')}</dd>
        </dl>
        <h4>Metadata</h4>
        <pre class="audit-metadata">${escapeHtml(JSON.stringify(row.metadata || {}, null, 2))}</pre>
      </aside>
    `;
  }

  function render() {
    const card = ensureCard();
    if (card) card.innerHTML = renderCardBody();
  }

  function csvEscape(value) {
    const text = value === null || value === undefined ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value));
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function exportCsv() {
    if (!rows.length) return;
    const columns = Object.keys(rows[0] || {});
    const csv = [columns.join(','), ...rows.map(row => columns.map(column => csvEscape(row[column])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mendaki-audit-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function bind() {
    if (window.__auditHistoryBound) return;
    window.__auditHistoryBound = true;
    document.addEventListener('submit', event => {
      const form = event.target.closest('[data-audit-form]');
      if (!form) return;
      event.preventDefault();
      runAuditSearch();
    }, true);
    document.addEventListener('click', event => {
      const run = event.target.closest('[data-audit-run]');
      if (run) { runAuditSearch(); return; }
      const exportButton = event.target.closest('[data-audit-export]');
      if (exportButton) { exportCsv(); return; }
      const select = event.target.closest('[data-audit-select]');
      if (select) {
        selectedId = select.dataset.auditSelect || '';
        render();
      }
    }, true);
  }

  window.MENDAKIAuditHistory = { render, runAuditSearch, exportCsv };

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    window.setTimeout(async () => {
      await fetchOptions();
      render();
    }, 1600);
  });
  window.addEventListener('volunteer-auth-ready', async () => { await fetchOptions(); render(); });
  window.addEventListener('volunteer-auth-changed', async () => { await fetchOptions(); render(); });
})();
