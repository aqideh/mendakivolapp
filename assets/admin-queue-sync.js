(() => {
  if (window.__mendakiAdminQueueSyncInstalled) return;
  window.__mendakiAdminQueueSyncInstalled = true;

  const syncState = {
    signups: { loading: false, loaded: false, error: '' },
    attendance: { loading: false, loaded: false, error: '' }
  };

  function store() { return window.VolunteerDataStore; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function hasSession() { return Boolean(store()?.getSession?.()?.email); }
  function canSync() { return Boolean(isAdmin() && hasSession()); }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }

  function remountAdminArea(options = {}) {
    if (options.remount === false) return;
    window.MENDAKIAdminWorkspace?.mountArea?.();
  }

  async function syncQueue(area, options = {}) {
    if (!canSync()) return;
    const state = syncState[area];
    if (!state || state.loading) return;

    state.loading = true;
    state.error = '';
    remountAdminArea(options);

    try {
      if (area === 'signups' && typeof store()?.fetchSupabaseOpportunitySignups === 'function') {
        await store().fetchSupabaseOpportunitySignups();
      }
      if (area === 'attendance' && typeof store()?.fetchSupabaseAttendanceClaims === 'function') {
        await store().fetchSupabaseAttendanceClaims();
      }
      state.loaded = true;
    } catch (error) {
      state.error = error.message || `Could not refresh ${area} queue.`;
    } finally {
      state.loading = false;
      remountAdminArea(options);
    }
  }

  function queueStats(area) {
    if (area === 'signups') {
      const rows = store()?.getOpportunitySignups?.() || [];
      return {
        total: rows.length,
        pending: rows.filter(row => ['pending_review', 'waitlisted'].includes(String(row.status || ''))).length,
        label: 'pending / waitlisted sign-ups'
      };
    }

    if (area === 'attendance') {
      const rows = store()?.getAttendanceClaims?.() || [];
      return {
        total: rows.length,
        pending: rows.filter(row => ['checked_in', 'submitted', 'clarification_requested', 'pending_submission'].includes(String(row.claimStatus || row.claim_status || ''))).length,
        label: 'attendance items needing review'
      };
    }

    return { total: 0, pending: 0, label: 'items' };
  }

  function prependQueueHeader(area, host) {
    const state = syncState[area];
    if (!host || !state || host.querySelector(`[data-admin-queue-header="${area}"]`)) return;

    const stats = queueStats(area);
    const label = area === 'signups' ? 'Opportunity sign-up queue' : 'Attendance verification queue';
    const actionText = state.loading ? 'Refreshing...' : 'Refresh queue';
    const html = `
      <section class="phase36-table-card" data-admin-queue-header="${escapeHtml(area)}">
        <div class="phase36-table-head">
          <div>
            <h4>${escapeHtml(label)}</h4>
            <p class="dashboard-muted">Open a row to review it. Drawer actions handle approval/verification.</p>
          </div>
          <button class="button dashboard-secondary" type="button" data-refresh-admin-queue="${escapeHtml(area)}" ${state.loading ? 'disabled' : ''}>${escapeHtml(actionText)}</button>
        </div>
        ${state.error ? `<p class="dashboard-muted error">${escapeHtml(state.error)}</p>` : ''}
        <div class="dashboard-stat-grid">
          <div class="dashboard-stat"><strong>${escapeHtml(stats.pending)}</strong><span>${escapeHtml(stats.label)}</span></div>
          <div class="dashboard-stat"><strong>${escapeHtml(stats.total)}</strong><span>Total loaded records</span></div>
        </div>
        <p class="dashboard-muted">If rows are missing, use Refresh queue. Then click a row to open Confirm / Waitlist / Decline or Verify / Request clarification / Reject actions.</p>
      </section>
    `;
    host.insertAdjacentHTML('afterbegin', html);
  }

  function wrapAdminTablesRender() {
    const tables = window.MENDAKIAdminTables;
    if (!tables || typeof tables.render !== 'function' || tables.render.__adminQueueSyncWrapped) return;

    const originalRender = tables.render.bind(tables);
    const wrapped = function adminQueueSyncRender(area, host, ctx) {
      const result = originalRender(area, host, ctx);
      if ((area === 'signups' || area === 'attendance') && canSync()) {
        prependQueueHeader(area, host?.querySelector('.phase36-page') || host);
        const state = syncState[area];
        if (!state.loaded && !state.loading) {
          window.setTimeout(() => syncQueue(area), 0);
        }
      }
      return result;
    };

    wrapped.__adminQueueSyncWrapped = true;
    tables.render = wrapped;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-refresh-admin-queue]');
    if (!button) return;

    event.preventDefault();
    syncQueue(button.dataset.refreshAdminQueue || '');
  }, true);

  function install() { wrapAdminTablesRender(); }

  install();
  document.addEventListener('DOMContentLoaded', install);
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', () => {
    syncState.signups.loaded = false;
    syncState.attendance.loaded = false;
    install();
  });

  window.MENDAKIAdminQueueSync = { syncQueue, syncState, install };
})();
