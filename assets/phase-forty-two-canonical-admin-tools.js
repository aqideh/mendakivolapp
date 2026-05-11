(() => {
  if (window.__phaseFortyTwoCanonicalAdminToolsInstalled) return;
  window.__phaseFortyTwoCanonicalAdminToolsInstalled = true;

  const REPORTS = {
    hours: ['Volunteer hours', 'get_admin_volunteer_hours_report', ['date', 'opportunityId', 'status'], ['', 'verified', 'adjusted', 'submitted', 'checked_in', 'pending_submission', 'rejected']],
    attendance: ['Attendance verification', 'get_admin_attendance_verification_report', ['date', 'status'], ['', 'pending_submission', 'checked_in', 'submitted', 'verified', 'adjusted', 'clarification_requested', 'rejected']],
    participation: ['Opportunity participation', 'get_admin_participation_report', ['date', 'opportunityId', 'status'], ['', 'pending_review', 'registered', 'confirmed', 'waitlisted', 'declined', 'cancelled', 'completed']],
    training: ['Training completion', 'get_admin_training_completion_report', ['date', 'status'], ['', 'registered', 'waitlisted', 'completed', 'cancelled']],
    referrals: ['Referrals', 'get_admin_referral_report', ['date', 'status'], ['', 'accepted', 'converted', 'cancelled', 'duplicate']],
    points: ['Points and achievements', 'get_admin_points_report', ['date', 'reason'], ['', 'attendance_verified', 'training_completed', 'referral_accepted', 'admin_adjustment']]
  };

  const state42 = {
    reports: { type: 'hours', rows: [], loading: false, error: '', filters: {} },
    audit: { rows: [], loading: false, error: '', selected: '', filters: {}, options: { action_types: [], entity_types: [] } },
    notifications: { rows: [], loading: false, error: '' }
  };

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }
  function fmt(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
  }
  function csvCell(value) {
    const text = value == null ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value));
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
  function downloadCsv(filename, rows) {
    if (!rows.length) return;
    const cols = Object.keys(rows[0] || {});
    const csv = [cols.join(','), ...rows.map(row => cols.map(col => csvCell(row[col])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function table(rows, empty = 'No rows loaded yet.') {
    if (!rows.length) return `<div class="phase36-empty">${escapeHtml(empty)}</div>`;
    const cols = Object.keys(rows[0] || {}).slice(0, 12);
    return `
      <section class="phase36-table-card">
        <div class="phase36-table-head"><h4>Results</h4><span class="dashboard-muted">${rows.length} row${rows.length === 1 ? '' : 's'}</span></div>
        <table class="phase36-table"><thead><tr>${cols.map(col => `<th>${escapeHtml(col)}</th>`).join('')}</tr></thead><tbody>
          ${rows.slice(0, 50).map(row => `<tr>${cols.map(col => `<td>${escapeHtml(row[col] == null ? '' : (typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col]))}</td>`).join('')}</tr>`).join('')}
        </tbody></table>
      </section>
      ${rows.length > 50 ? '<p class="dashboard-muted">Showing first 50 rows. Export CSV for full result.</p>' : ''}
    `;
  }

  function renderReportPage(host) {
    const s = state42.reports;
    const [label, , filters, options] = REPORTS[s.type] || REPORTS.hours;
    host.innerHTML = `
      <div class="phase35-page" data-phase42-page="reports">
        <div class="phase35-page-note">Canonical report runner. Legacy report card is no longer required.</div>
        <form class="profile-form" data-phase42-report-form>
          <label>Report type<select name="type">${Object.entries(REPORTS).map(([key, value]) => `<option value="${key}" ${key === s.type ? 'selected' : ''}>${escapeHtml(value[0])}</option>`).join('')}</select></label>
          <div class="session-form-row"><label>Start date<input name="startDate" type="date" value="${escapeHtml(s.filters.startDate || '')}"></label><label>End date<input name="endDate" type="date" value="${escapeHtml(s.filters.endDate || '')}"></label></div>
          ${filters.includes('opportunityId') ? `<label>Opportunity ID<input name="opportunityId" value="${escapeHtml(s.filters.opportunityId || '')}" placeholder="Optional"></label>` : ''}
          ${filters.includes('status') ? `<label>Status<select name="status">${options.map(v => `<option value="${escapeHtml(v)}" ${v === (s.filters.status || '') ? 'selected' : ''}>${escapeHtml(v || 'Any status')}</option>`).join('')}</select></label>` : ''}
          ${filters.includes('reason') ? `<label>Reason<select name="reason">${options.map(v => `<option value="${escapeHtml(v)}" ${v === (s.filters.reason || '') ? 'selected' : ''}>${escapeHtml(v || 'Any reason')}</option>`).join('')}</select></label>` : ''}
          <div class="dashboard-actions"><button class="button button-primary" type="submit">${s.loading ? 'Running...' : 'Run report'}</button><button class="button dashboard-secondary" type="button" data-phase42-report-export ${s.rows.length ? '' : 'disabled'}>Export CSV</button></div>
        </form>
        ${s.error ? `<p class="dashboard-muted error">${escapeHtml(s.error)}</p>` : ''}
        <p class="dashboard-muted">${escapeHtml(s.rows.length)} row${s.rows.length === 1 ? '' : 's'} loaded for ${escapeHtml(label)}.</p>
        ${table(s.rows)}
      </div>
    `;
    return true;
  }

  async function runReport(form) {
    const supabase = client();
    if (!supabase || !isAdmin()) return;
    const data = new FormData(form);
    const type = String(data.get('type') || 'hours');
    state42.reports.type = type;
    state42.reports.filters = Object.fromEntries(data.entries());
    state42.reports.loading = true;
    state42.reports.error = '';
    window.MENDAKIPhase34AdminShell?.mountArea?.();
    const [, rpc, filters] = REPORTS[type] || REPORTS.hours;
    const args = {};
    if (filters.includes('date')) { args.p_start_date = state42.reports.filters.startDate || null; args.p_end_date = state42.reports.filters.endDate || null; }
    if (filters.includes('opportunityId')) args.p_opportunity_id = state42.reports.filters.opportunityId || null;
    if (filters.includes('status')) args.p_status = state42.reports.filters.status || null;
    if (filters.includes('reason')) args.p_reason = state42.reports.filters.reason || null;
    try {
      const { data: rows, error } = await supabase.rpc(rpc, args);
      if (error) throw error;
      state42.reports.rows = Array.isArray(rows) ? rows : [];
    } catch (error) {
      state42.reports.rows = [];
      state42.reports.error = error.message || 'Report failed.';
    } finally {
      state42.reports.loading = false;
      window.MENDAKIPhase34AdminShell?.mountArea?.();
    }
  }

  function renderAuditPage(host) {
    const s = state42.audit;
    const selected = s.rows.find(row => row.id === s.selected);
    host.innerHTML = `
      <div class="phase35-page" data-phase42-page="audit">
        <div class="phase35-page-note">Canonical audit search. Uses the same Supabase RPCs as the retired audit card.</div>
        <form class="profile-form" data-phase42-audit-form>
          <div class="session-form-row"><label>Start date<input name="startDate" type="date" value="${escapeHtml(s.filters.startDate || '')}"></label><label>End date<input name="endDate" type="date" value="${escapeHtml(s.filters.endDate || '')}"></label></div>
          <div class="session-form-row"><label>Action<input name="actionType" value="${escapeHtml(s.filters.actionType || '')}" placeholder="Optional action type"></label><label>Entity<input name="entityType" value="${escapeHtml(s.filters.entityType || '')}" placeholder="Optional entity type"></label></div>
          <div class="session-form-row"><label>Actor<input name="actor" value="${escapeHtml(s.filters.actor || '')}" placeholder="Optional actor email"></label><label>Target<input name="target" value="${escapeHtml(s.filters.target || '')}" placeholder="Optional target email"></label></div>
          <label>Limit<select name="limit"><option value="50">50</option><option value="100" ${String(s.filters.limit || '100') === '100' ? 'selected' : ''}>100</option><option value="250">250</option></select></label>
          <div class="dashboard-actions"><button class="button button-primary" type="submit">${s.loading ? 'Searching...' : 'Search audit'}</button><button class="button dashboard-secondary" type="button" data-phase42-audit-export ${s.rows.length ? '' : 'disabled'}>Export CSV</button></div>
        </form>
        ${s.error ? `<p class="dashboard-muted error">${escapeHtml(s.error)}</p>` : ''}
        <div class="audit-history-grid"><div>${table(s.rows, 'No audit rows loaded yet.')}</div><aside class="audit-details"><h3>Details</h3>${selected ? `<pre class="audit-metadata">${escapeHtml(JSON.stringify(selected, null, 2))}</pre>` : '<p class="dashboard-muted">Click a row from the table after search to inspect details in exported CSV or audit module.</p>'}</aside></div>
      </div>
    `;
    return true;
  }

  async function runAudit(form) {
    const supabase = client();
    if (!supabase || !isAdmin()) return;
    state42.audit.filters = Object.fromEntries(new FormData(form).entries());
    state42.audit.loading = true;
    state42.audit.error = '';
    window.MENDAKIPhase34AdminShell?.mountArea?.();
    const f = state42.audit.filters;
    try {
      const { data, error } = await supabase.rpc('get_admin_audit_logs', { p_start_date: f.startDate || null, p_end_date: f.endDate || null, p_action_type: f.actionType || null, p_actor: f.actor || null, p_entity_type: f.entityType || null, p_target: f.target || null, p_limit: Number(f.limit || 100) });
      if (error) throw error;
      state42.audit.rows = Array.isArray(data) ? data : [];
    } catch (error) {
      state42.audit.rows = [];
      state42.audit.error = error.message || 'Audit search failed.';
    } finally {
      state42.audit.loading = false;
      window.MENDAKIPhase34AdminShell?.mountArea?.();
    }
  }

  async function loadNotifications() {
    const supabase = client();
    if (!supabase || !isAdmin()) return;
    state42.notifications.loading = true;
    state42.notifications.error = '';
    window.MENDAKIPhase34AdminShell?.mountArea?.();
    try {
      const { data, error } = await supabase.from('app_notifications').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      state42.notifications.rows = Array.isArray(data) ? data : [];
    } catch (error) {
      state42.notifications.rows = [];
      state42.notifications.error = error.message || 'Notification load failed.';
    } finally {
      state42.notifications.loading = false;
      window.MENDAKIPhase34AdminShell?.mountArea?.();
    }
  }

  function renderNotificationsPage(host) {
    const s = state42.notifications;
    host.innerHTML = `
      <div class="phase35-page" data-phase42-page="notifications">
        <div class="phase35-page-note">Canonical notification history. Preference editing remains a future canonical workflow.</div>
        <div class="dashboard-actions"><button class="button button-primary" type="button" data-phase42-notifications-load>${s.loading ? 'Loading...' : 'Refresh notifications'}</button></div>
        ${s.error ? `<p class="dashboard-muted error">${escapeHtml(s.error)}</p>` : ''}
        ${table(s.rows, 'No notification rows loaded yet.')}
      </div>
    `;
    return true;
  }

  function renderSystemPage(host) {
    host.innerHTML = `
      <div class="phase35-page" data-phase42-page="system">
        <div class="phase35-action-grid">
          <article class="phase35-action-card"><strong>SQL validation</strong><span>Run supabase/verification/phase41_validation_checks.sql.</span></article>
          <article class="phase35-action-card"><strong>Browser smoke</strong><span>Run scripts/phase41-admin-ui-smoke.js in an admin browser session.</span></article>
          <article class="phase35-action-card"><strong>Legacy retirement</strong><span>Legacy cards are hidden and no longer moved into the shell.</span></article>
          <article class="phase35-action-card"><strong>Production gate</strong><span>Do not remove stored legacy files until manual QA passes.</span></article>
        </div>
      </div>
    `;
    return true;
  }

  function render(area, host) {
    if (area === 'reports') return renderReportPage(host);
    if (area === 'audit') return renderAuditPage(host);
    if (area === 'notifications') return renderNotificationsPage(host);
    if (area === 'system') return renderSystemPage(host);
    return false;
  }

  document.addEventListener('submit', event => {
    const report = event.target.closest('[data-phase42-report-form]');
    if (report) { event.preventDefault(); runReport(report); return; }
    const audit = event.target.closest('[data-phase42-audit-form]');
    if (audit) { event.preventDefault(); runAudit(audit); }
  }, true);

  document.addEventListener('click', event => {
    if (event.target.closest('[data-phase42-report-export]')) downloadCsv(`mendaki-${state42.reports.type}-report-${new Date().toISOString().slice(0, 10)}.csv`, state42.reports.rows);
    if (event.target.closest('[data-phase42-audit-export]')) downloadCsv(`mendaki-audit-${new Date().toISOString().slice(0, 10)}.csv`, state42.audit.rows);
    if (event.target.closest('[data-phase42-notifications-load]')) loadNotifications();
  }, true);

  window.MENDAKIPhase42CanonicalAdminTools = { render, runReport, runAudit, loadNotifications };
})();
