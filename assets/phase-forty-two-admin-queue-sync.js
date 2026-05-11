(() => {
  if (window.__phaseFortyTwoAdminQueueSyncInstalled) return;
  window.__phaseFortyTwoAdminQueueSyncInstalled = true;

  const syncState = {
    signups: { loading: false, loaded: false, error: '' },
    attendance: { loading: false, loaded: false, error: '' }
  };

  function store() { return window.VolunteerDataStore; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function hasSession() { return Boolean(store()?.getSession?.()?.email); }
  function canSync() { return Boolean(isAdmin() && hasSession()); }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }

  async function syncQueue(area, options = {}) {
    if (!canSync()) return;
    const state = syncState[area];
    if (!state || state.loading) return;
    state.loading = true;
    state.error = '';
    if (options.remount !== false) window.MENDAKIPhase34AdminShell?.mountArea?.();
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
      if (options.remount !== false) window.MENDAKIPhase34AdminShell?.mountArea?.();
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
    if (!host || !state || host.querySelector(`[data-phase42-queue-header="${area}"]`)) return;
    const stats = queueStats(area);
    const label = area === 'signups' ? 'Opportunity sign-up queue' : 'Attendance verification queue';
    const actionText = state.loading ? 'Refreshing...' : 'Refresh queue';
    const html = `
      <section class="phase36-table-card" data-phase42-queue-header="${escapeHtml(area)}">
        <div class="phase36-table-head">
          <div>
            <h4>${escapeHtml(label)}</h4>
            <p class="dashboard-muted">Open a row to review it. Drawer actions handle approval/verification.</p>
          </div>
          <button class="button dashboard-secondary" type="button" data-phase42-refresh-admin-queue="${escapeHtml(area)}" ${state.loading ? 'disabled' : ''}>${escapeHtml(actionText)}</button>
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

  function wrapPhase36Render() {
    const tables = window.MENDAKIPhase36AdminTables;
    if (!tables || typeof tables.render !== 'function' || tables.render.__phase42QueueSyncWrapped) return;
    const originalRender = tables.render.bind(tables);
    const wrapped = function phase42QueueSyncRender(area, host, ctx) {
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
    wrapped.__phase42QueueSyncWrapped = true;
    tables.render = wrapped;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-phase42-refresh-admin-queue]');
    if (!button) return;
    event.preventDefault();
    syncQueue(button.dataset.phase42RefreshAdminQueue || '');
  }, true);

  function install() { wrapPhase36Render(); }
  install();
  document.addEventListener('DOMContentLoaded', install);
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', () => {
    syncState.signups.loaded = false;
    syncState.attendance.loaded = false;
    install();
  });

  window.MENDAKIPhase42AdminQueueSync = { syncQueue, syncState, install };
})();
