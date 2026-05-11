(() => {
  if (window.__mendakiDataAccessInstalled) return;
  window.__mendakiDataAccessInstalled = true;

  const canonicalTables = Object.freeze({
    users: 'app_users',
    opportunities: 'app_opportunities',
    opportunitySessions: 'app_opportunity_sessions',
    opportunitySignups: 'app_opportunity_signups',
    attendanceClaims: 'app_attendance_claims',
    trainingSessions: 'app_training_sessions',
    trainingSignups: 'app_training_signups',
    notifications: 'app_notifications',
    auditLogs: 'app_audit_logs',
    pointsLedger: 'app_points_ledger'
  });

  const deprecatedTables = Object.freeze([
    'opportunities',
    'opportunity_sessions',
    'opportunity_signups',
    'attendance_claims',
    'trainings',
    'training_signups'
  ]);

  const state = {
    loading: new Set(),
    lastError: new Map(),
    lastRefreshedAt: new Map()
  };

  function store() { return window.VolunteerDataStore; }
  function asArray(value) { return Array.isArray(value) ? value : []; }
  function session() { return store()?.getSession?.() || null; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function now() { return new Date().toISOString(); }

  function setLoading(domain, loading) {
    if (loading) state.loading.add(domain);
    else state.loading.delete(domain);
    window.dispatchEvent(new CustomEvent('mendaki-data-access-state', { detail: snapshot(domain) }));
  }

  function setError(domain, error) {
    if (error) state.lastError.set(domain, error?.message || String(error));
    else state.lastError.delete(domain);
  }

  function markRefreshed(domain) {
    state.lastRefreshedAt.set(domain, now());
  }

  function snapshot(domain = '') {
    return {
      domain,
      loading: domain ? state.loading.has(domain) : state.loading.size > 0,
      error: domain ? state.lastError.get(domain) || '' : '',
      lastRefreshedAt: domain ? state.lastRefreshedAt.get(domain) || '' : '',
      canonicalTables,
      deprecatedTables
    };
  }

  async function runRefresh(domain, refresher, fallbackReader) {
    if (typeof refresher !== 'function') return asArray(fallbackReader?.());
    setLoading(domain, true);
    setError(domain, null);
    try {
      const result = await refresher();
      markRefreshed(domain);
      return asArray(result);
    } catch (error) {
      setError(domain, error);
      console.warn(`Could not refresh ${domain}.`, error);
      return asArray(fallbackReader?.());
    } finally {
      setLoading(domain, false);
    }
  }

  function listOpportunitySignups() {
    return asArray(store()?.getOpportunitySignups?.());
  }

  function listAttendanceClaims() {
    return asArray(store()?.getAttendanceClaims?.());
  }

  function listTrainingSignups() {
    return asArray(store()?.getTrainingSignups?.());
  }

  async function refreshOpportunitySignups(options = {}) {
    if (options.adminOnly && !isAdmin()) return listOpportunitySignups();
    if (!session()?.email) return listOpportunitySignups();
    return runRefresh('opportunitySignups', store()?.fetchSupabaseOpportunitySignups, listOpportunitySignups);
  }

  async function refreshAttendanceClaims(options = {}) {
    if (options.adminOnly && !isAdmin()) return listAttendanceClaims();
    if (!session()?.email) return listAttendanceClaims();
    return runRefresh('attendanceClaims', store()?.fetchSupabaseAttendanceClaims, listAttendanceClaims);
  }

  async function refreshAdminQueue(area, options = {}) {
    if (area === 'signups') return refreshOpportunitySignups({ ...options, adminOnly: true });
    if (area === 'attendance') return refreshAttendanceClaims({ ...options, adminOnly: true });
    return [];
  }

  function countByStatus(items, statuses) {
    const set = new Set(asArray(statuses).map(String));
    return asArray(items).filter(item => set.has(String(item.status || item.claimStatus || ''))).length;
  }

  function adminQueueCounts() {
    return {
      pendingSignups: countByStatus(listOpportunitySignups(), ['pending_review', 'waitlisted']),
      attendanceQueue: countByStatus(listAttendanceClaims(), ['checked_in', 'submitted', 'clarification_requested']),
      trainingQueue: countByStatus(listTrainingSignups(), ['registered', 'waitlisted'])
    };
  }

  window.MENDAKIDataAccess = Object.freeze({
    canonicalTables,
    deprecatedTables,
    snapshot,
    listOpportunitySignups,
    listAttendanceClaims,
    listTrainingSignups,
    refreshOpportunitySignups,
    refreshAttendanceClaims,
    refreshAdminQueue,
    adminQueueCounts,
    countByStatus
  });
})();
