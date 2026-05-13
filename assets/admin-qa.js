import './demo-dashboard-ui.js';

(() => {
  if (window.__mendakiAdminQaInstalled) return;
  window.__mendakiAdminQaInstalled = true;

  const state = {
    running: false,
    results: [],
    lastRunAt: '',
    host: null
  };

  const REQUIRED_TABLES = [
    'app_users',
    'app_opportunities',
    'app_opportunity_sessions',
    'app_opportunity_signups',
    'app_attendance_claims',
    'app_training_sessions',
    'app_training_signups',
    'app_referrals',
    'app_points_ledger',
    'app_achievements',
    'app_user_achievements',
    'app_notifications',
    'app_audit_logs',
    'app_news_items'
  ];

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }

  function result(status, label, detail = '') {
    state.results.push({ status, label, detail });
    render();
  }

  function counts() {
    return state.results.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, { pass: 0, warn: 0, fail: 0 });
  }

  function cardMarkup() {
    const summary = counts();
    return `
      <section class="phase32-qa-card" data-admin-qa-card>
        <div class="section-header">
          <div>
            <p class="eyebrow dark">Admin · QA</p>
            <h2>QA smoke checks</h2>
            <p class="dashboard-muted">Run read-only checks for schema, grants, and basic Supabase app contracts.</p>
          </div>
          <div class="phase32-qa-actions">
            <button class="button button-primary" type="button" data-admin-qa-run ${state.running ? 'disabled' : ''}>${state.running ? 'Running...' : 'Run checks'}</button>
            <button class="button dashboard-secondary" type="button" data-admin-qa-clear ${state.running ? 'disabled' : ''}>Clear</button>
          </div>
        </div>
        <div class="phase32-qa-summary">
          <div class="phase32-qa-tile"><strong>${summary.pass || 0}</strong><span>Passed</span></div>
          <div class="phase32-qa-tile"><strong>${summary.warn || 0}</strong><span>Warnings</span></div>
          <div class="phase32-qa-tile"><strong>${summary.fail || 0}</strong><span>Failures</span></div>
        </div>
        <p class="dashboard-muted">${state.lastRunAt ? `Last run: ${escapeHtml(state.lastRunAt)}` : 'Not run yet.'}</p>
        <div class="phase32-qa-result-list">
          ${state.results.length ? state.results.map(renderResult).join('') : '<div class="admin-content-item"><span>No checks run yet.</span></div>'}
        </div>
      </section>
    `;
  }

  function render() {
    if (!state.host || !isAdmin()) return false;
    state.host.innerHTML = cardMarkup();
    return true;
  }

  function renderResult(item) {
    return `
      <article class="phase32-qa-result ${escapeHtml(item.status)}">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </article>
    `;
  }

  async function countTable(table) {
    const supabase = client();
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  }

  async function checkAuth() {
    if (!client()) return result('fail', 'Supabase client', 'Supabase client is not configured.');
    const session = store()?.getSession?.();
    if (!session?.email) return result('fail', 'Signed-in session', 'No signed-in user detected.');
    if (!isAdmin()) return result('fail', 'Admin role', 'Signed-in user is not admin; QA panel should only run for admins.');
    result('pass', 'Admin session', `${session.email} is signed in with admin access.`);
  }

  async function checkRequiredTables() {
    let passed = 0;
    const failures = [];
    for (const table of REQUIRED_TABLES) {
      try {
        await countTable(table);
        passed += 1;
      } catch (error) {
        failures.push(`${table}: ${error.message}`);
      }
    }
    if (failures.length) result('fail', 'Required table access', failures.join(' | '));
    else result('pass', 'Required table access', `${passed} required tables accessible.`);
  }

  async function checkGrantAudit() {
    try {
      const { data, error } = await client().rpc('get_phase_29_5_rpc_grant_audit');
      if (error) throw error;
      const exposed = (Array.isArray(data) ? data : []).filter(row => row.anon_can_execute === true);
      if (exposed.length) result('fail', 'Phase 29.5 anonymous grant audit', `${exposed.length} targeted RPC(s) still executable by anon.`);
      else result('pass', 'Phase 29.5 anonymous grant audit', 'No targeted sensitive RPCs show anon execute access.');
    } catch (error) {
      result('warn', 'Phase 29.5 anonymous grant audit', error.message || 'Grant audit helper could not be called.');
    }
  }

  async function checkTrainingContracts() {
    try {
      const { data, error } = await client()
        .from('app_training_sessions')
        .select('id,parent_training_id,session_title,starts_at,ends_at,default_hours,is_session_instance')
        .limit(20);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const missingParent = rows.filter(row => !row.parent_training_id);
      if (missingParent.length) result('warn', 'Training session parent fields', `${missingParent.length} sampled training row(s) have no parent_training_id.`);
      else result('pass', 'Training session parent fields', `Sampled ${rows.length} training row(s); parent/session fields readable.`);
    } catch (error) {
      result('fail', 'Training session parent fields', error.message);
    }

    try {
      const { data, error } = await client()
        .from('app_training_signups')
        .select('id,training_id,training_session_id,session_title,completed_session_at')
        .limit(20);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const missingSession = rows.filter(row => !row.training_session_id);
      if (missingSession.length) result('warn', 'Training signup session fields', `${missingSession.length} sampled signup(s) missing training_session_id.`);
      else result('pass', 'Training signup session fields', `Sampled ${rows.length} training signup(s); session fields readable.`);
    } catch (error) {
      result('fail', 'Training signup session fields', error.message);
    }
  }

  async function checkOpportunityContracts() {
    try {
      const { data, error } = await client()
        .from('app_opportunity_signups')
        .select('id,opportunity_id,session_id,status')
        .limit(20);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const missingSession = rows.filter(row => !row.session_id && !['cancelled', 'declined'].includes(String(row.status || '')));
      if (missingSession.length) result('warn', 'Opportunity signup session fields', `${missingSession.length} sampled active signup(s) missing session_id.`);
      else result('pass', 'Opportunity signup session fields', `Sampled ${rows.length} opportunity signup(s); no active missing session_id found.`);
    } catch (error) {
      result('fail', 'Opportunity signup session fields', error.message);
    }

    try {
      const { data, error } = await client()
        .from('app_attendance_claims')
        .select('id,signup_id,opportunity_id,session_id,claim_status')
        .limit(20);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const missingSession = rows.filter(row => !row.session_id);
      if (missingSession.length) result('warn', 'Attendance claim session fields', `${missingSession.length} sampled attendance claim(s) missing session_id.`);
      else result('pass', 'Attendance claim session fields', `Sampled ${rows.length} attendance claim(s); session_id present.`);
    } catch (error) {
      result('fail', 'Attendance claim session fields', error.message);
    }
  }

  async function checkReportsAndAudit() {
    const reportRpc = 'get_admin_volunteer_hours_report';
    try {
      const { data, error } = await client().rpc(reportRpc, { p_start_date: null, p_end_date: null, p_opportunity_id: null, p_status: null });
      if (error) throw error;
      result('pass', 'Admin reports RPC', `${reportRpc} returned ${Array.isArray(data) ? data.length : 0} row(s).`);
    } catch (error) {
      result('warn', 'Admin reports RPC', error.message);
    }

    try {
      const { data, error } = await client().rpc('get_admin_audit_logs', {
        p_start_date: null,
        p_end_date: null,
        p_action_type: null,
        p_actor: null,
        p_entity_type: null,
        p_target: null,
        p_limit: 5
      });
      if (error) throw error;
      result('pass', 'Admin audit RPC', `Audit RPC returned ${Array.isArray(data) ? data.length : 0} row(s).`);
    } catch (error) {
      result('warn', 'Admin audit RPC', error.message);
    }
  }

  async function checkCounts() {
    const tables = ['app_opportunities', 'app_opportunity_sessions', 'app_opportunity_signups', 'app_attendance_claims', 'app_training_sessions', 'app_training_signups', 'app_referrals', 'app_points_ledger', 'app_notifications', 'app_audit_logs'];
    const output = [];
    for (const table of tables) {
      try {
        output.push(`${table.replace('app_', '')}: ${await countTable(table)}`);
      } catch (error) {
        output.push(`${table}: unavailable`);
      }
    }
    result('pass', 'Operational counts', output.join(' · '));
  }

  async function runChecks() {
    if (state.running) return;
    state.running = true;
    state.results = [];
    state.lastRunAt = new Date().toLocaleString('en-SG');
    render();
    try {
      await checkAuth();
      await checkRequiredTables();
      await checkGrantAudit();
      await checkTrainingContracts();
      await checkOpportunityContracts();
      await checkReportsAndAudit();
      await checkCounts();
    } finally {
      state.running = false;
      render();
    }
  }

  function bind() {
    if (window.__mendakiAdminQaBound) return;
    window.__mendakiAdminQaBound = true;
    document.addEventListener('click', event => {
      if (event.target.closest('[data-admin-qa-run]')) {
        event.preventDefault();
        runChecks();
        return;
      }
      if (event.target.closest('[data-admin-qa-clear]')) {
        state.results = [];
        state.lastRunAt = '';
        render();
      }
    }, true);
  }

  function renderInto(host) {
    state.host = host;
    bind();
    return render();
  }

  function install() { bind(); }

  window.MENDAKIAdminQA = { install, render, renderInto, runChecks };

  document.addEventListener('DOMContentLoaded', install);
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', install);
})();
