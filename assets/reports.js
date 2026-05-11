(() => {
  const REPORTS = {
    hours: {
      label: 'Volunteer hours',
      rpc: 'get_admin_volunteer_hours_report',
      filters: ['date', 'opportunityId', 'status'],
      statusOptions: ['', 'verified', 'adjusted', 'submitted', 'checked_in', 'pending_submission', 'rejected']
    },
    attendance: {
      label: 'Attendance verification',
      rpc: 'get_admin_attendance_verification_report',
      filters: ['date', 'status'],
      statusOptions: ['', 'pending_submission', 'checked_in', 'submitted', 'verified', 'adjusted', 'clarification_requested', 'rejected']
    },
    participation: {
      label: 'Opportunity participation',
      rpc: 'get_admin_participation_report',
      filters: ['date', 'opportunityId', 'status'],
      statusOptions: ['', 'pending_review', 'registered', 'confirmed', 'waitlisted', 'declined', 'cancelled', 'completed']
    },
    training: {
      label: 'Training completion',
      rpc: 'get_admin_training_completion_report',
      filters: ['date', 'status'],
      statusOptions: ['', 'registered', 'waitlisted', 'completed', 'cancelled']
    },
    referrals: {
      label: 'Referrals',
      rpc: 'get_admin_referral_report',
      filters: ['date', 'status'],
      statusOptions: ['', 'accepted', 'converted', 'cancelled', 'duplicate']
    },
    points: {
      label: 'Points and achievements',
      rpc: 'get_admin_points_report',
      filters: ['date', 'reason'],
      reasonOptions: ['', 'attendance_verified', 'training_completed', 'referral_accepted', 'admin_adjustment']
    }
  };

  let selectedReport = 'hours';
  let rows = [];
  let loading = false;
  let lastError = '';

  const qs = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => window.VolunteerDataStore?.utils?.escapeHtml?.(value) || String(value ?? '');

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }

  function reportConfig() { return REPORTS[selectedReport] || REPORTS.hours; }

  function ensureCard() {
    if (!isAdmin()) return null;
    const layout = qs('.dashboard-layout');
    if (!layout || qs('[data-reports-card]')) return qs('[data-reports-card]');
    const card = document.createElement('section');
    card.className = 'dashboard-card reports-card';
    card.dataset.reportsCard = 'true';
    card.dataset.dashboardCardRole = 'admin';
    card.innerHTML = renderCardBody();
    const adminPoints = qs('[data-admin-points-card]');
    if (adminPoints) adminPoints.insertAdjacentElement('afterend', card);
    else layout.append(card);
    return card;
  }

  function formValue(name) {
    return String(qs(`[data-report-filter="${name}"]`)?.value || '').trim();
  }

  function rpcArgs() {
    const config = reportConfig();
    const args = {};
    if (config.filters.includes('date')) {
      args.p_start_date = formValue('startDate') || null;
      args.p_end_date = formValue('endDate') || null;
    }
    if (config.filters.includes('opportunityId')) args.p_opportunity_id = formValue('opportunityId') || null;
    if (config.filters.includes('status')) args.p_status = formValue('status') || null;
    if (config.filters.includes('reason')) args.p_reason = formValue('reason') || null;
    return args;
  }

  async function runReport() {
    const supabase = client();
    if (!supabase || !isAdmin()) return;
    loading = true;
    lastError = '';
    render();
    try {
      const { data, error } = await supabase.rpc(reportConfig().rpc, rpcArgs());
      if (error) throw error;
      rows = Array.isArray(data) ? data : [];
    } catch (error) {
      rows = [];
      lastError = error.message || 'Could not load report.';
      console.warn('Report failed.', error);
    } finally {
      loading = false;
      render();
    }
  }

  function renderCardBody() {
    if (!isAdmin()) return '';
    const config = reportConfig();
    const columns = visibleColumns();
    return `
      <div class="section-header">
        <div>
          <p class="eyebrow dark">Admin</p>
          <h2>Reports and CSV exports</h2>
          <p class="dashboard-muted">Run operational reports and export CSVs for pilot tracking.</p>
        </div>
        <button class="text-button" type="button" data-report-run>${loading ? 'Loading...' : 'Run report'}</button>
      </div>
      <form class="profile-form report-filter-form" data-report-form>
        <label>Report type
          <select data-report-filter="type">
            ${Object.entries(REPORTS).map(([key, item]) => `<option value="${escapeHtml(key)}" ${key === selectedReport ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}
          </select>
        </label>
        <div class="session-form-row">
          <label>Start date<input type="date" data-report-filter="startDate"></label>
          <label>End date<input type="date" data-report-filter="endDate"></label>
        </div>
        ${config.filters.includes('opportunityId') ? '<label>Opportunity ID<input data-report-filter="opportunityId" placeholder="Optional opportunity ID"></label>' : ''}
        ${config.filters.includes('status') ? renderStatusFilter(config.statusOptions || []) : ''}
        ${config.filters.includes('reason') ? renderReasonFilter(config.reasonOptions || []) : ''}
        <div class="dashboard-actions">
          <button class="button button-primary" type="submit">Run report</button>
          <button class="button dashboard-secondary" type="button" data-report-export ${rows.length ? '' : 'disabled'}>Export CSV</button>
        </div>
      </form>
      ${lastError ? `<p class="dashboard-muted error">${escapeHtml(lastError)}</p>` : ''}
      <p class="dashboard-muted">${escapeHtml(rows.length)} row${rows.length === 1 ? '' : 's'} loaded for ${escapeHtml(config.label)}.</p>
      <div class="report-preview" data-report-preview>
        ${rows.length ? renderTable(columns, rows.slice(0, 25)) : '<div class="admin-content-item"><span>No report rows loaded yet.</span></div>'}
      </div>
    `;
  }

  function renderStatusFilter(options) {
    return `
      <label>Status
        <select data-report-filter="status">
          ${options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value || 'Any status')}</option>`).join('')}
        </select>
      </label>
    `;
  }

  function renderReasonFilter(options) {
    return `
      <label>Points reason
        <select data-report-filter="reason">
          ${options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value || 'Any reason')}</option>`).join('')}
        </select>
      </label>
    `;
  }

  function visibleColumns() {
    const first = rows[0] || sampleColumnsForReport();
    return Object.keys(first || {}).slice(0, 12);
  }

  function sampleColumnsForReport() {
    const samples = {
      hours: { volunteer_email: '', volunteer_name: '', opportunity_id: '', session_id: '', title: '', claim_status: '', verified_hours: '', reviewed_at: '' },
      attendance: { claim_id: '', volunteer_email: '', title: '', claim_status: '', claimed_hours: '', verified_hours: '', submitted_at: '', reviewed_at: '' },
      participation: { signup_id: '', volunteer_email: '', opportunity_id: '', session_id: '', title: '', status: '', signed_up_at: '', verified_hours: '' },
      training: { signup_id: '', training_id: '', volunteer_email: '', title: '', status: '', signed_up_at: '', completed_at: '' },
      referrals: { referral_id: '', referrer_email: '', referred_email: '', referral_code: '', status: '', accepted_at: '' },
      points: { ledger_id: '', volunteer_email: '', volunteer_name: '', points: '', reason: '', source_type: '', awarded_at: '' }
    };
    return samples[selectedReport] || samples.hours;
  }

  function formatCell(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function renderTable(columns, tableRows) {
    return `
      <div class="report-table-wrap">
        <table class="report-table">
          <thead><tr>${columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
          <tbody>
            ${tableRows.map(row => `<tr>${columns.map(column => `<td>${escapeHtml(formatCell(row[column]))}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${rows.length > tableRows.length ? `<p class="dashboard-muted">Showing first ${tableRows.length} rows. Export CSV for the full result.</p>` : ''}
    `;
  }

  function csvEscape(value) {
    const text = formatCell(value);
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
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `mendaki-${selectedReport}-report-${stamp}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function render() {
    const card = ensureCard();
    if (card) card.innerHTML = renderCardBody();
  }

  function bind() {
    if (window.__reportsBound) return;
    window.__reportsBound = true;
    document.addEventListener('change', event => {
      const type = event.target.closest('[data-report-filter="type"]');
      if (!type) return;
      selectedReport = type.value || 'hours';
      rows = [];
      lastError = '';
      render();
    }, true);
    document.addEventListener('submit', event => {
      const form = event.target.closest('[data-report-form]');
      if (!form) return;
      event.preventDefault();
      runReport();
    }, true);
    document.addEventListener('click', event => {
      if (event.target.closest('[data-report-run]')) { runReport(); return; }
      if (event.target.closest('[data-report-export]')) exportCsv();
    }, true);
  }

  window.MENDAKIReports = { render, runReport, exportCsv };

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    window.setTimeout(render, 1400);
  });
  window.addEventListener('volunteer-auth-ready', render);
  window.addEventListener('volunteer-auth-changed', render);
})();
