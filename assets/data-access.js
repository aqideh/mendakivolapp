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
  function client() { return store()?.authState?.supabase || null; }
  function asArray(value) { return Array.isArray(value) ? value : []; }
  function session() { return store()?.getSession?.() || null; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function now() { return new Date().toISOString(); }
  function currentAdminEmail() { return session()?.email || store()?.$?.email?.() || 'admin'; }
  function byId(items, id) { return asArray(items).find(item => String(item.id) === String(id)); }

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

  async function runMutation(domain, operation) {
    setLoading(domain, true);
    setError(domain, null);
    try {
      const result = await operation();
      if (result?.ok === false && !result?.transactional) throw new Error(result.reason || 'Mutation failed.');
      markRefreshed(domain);
      return result || { ok: true };
    } catch (error) {
      setError(domain, error);
      console.warn(`Could not mutate ${domain}.`, error);
      return { ok: false, reason: error.message || String(error) };
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

  function signupFromRpcRow(row, fallback = {}) {
    if (!row) return null;
    return {
      id: row.id,
      opportunityId: String(row.opportunity_id || fallback.opportunityId || ''),
      sessionId: row.session_id || fallback.sessionId || '',
      email: row.email || fallback.email || '',
      volunteerName: row.volunteer_name || fallback.volunteerName || 'Volunteer',
      title: row.title || fallback.title || '',
      type: row.type || fallback.type || '',
      category: row.category || fallback.category || '',
      time: row.time || fallback.time || '',
      location: row.location || fallback.location || '',
      commitment: row.commitment || fallback.commitment || '',
      hours: Number(row.hours ?? fallback.hours ?? 0),
      status: row.status || fallback.status || 'pending_review',
      signedUpAt: row.signed_up_at || fallback.signedUpAt || '',
      reviewedAt: row.reviewed_at || fallback.reviewedAt || '',
      reviewedBy: row.reviewed_by_email || fallback.reviewedBy || '',
      adminNotes: row.admin_notes || fallback.adminNotes || '',
      confirmedAt: row.confirmed_at || fallback.confirmedAt || '',
      waitlistedAt: row.waitlisted_at || fallback.waitlistedAt || '',
      declinedAt: row.declined_at || fallback.declinedAt || '',
      cancelledAt: row.cancelled_at || fallback.cancelledAt || '',
      completedAt: row.completed_at || fallback.completedAt || '',
      verifiedHours: Number(row.verified_hours ?? fallback.verifiedHours ?? 0),
      updatedAt: row.updated_at || fallback.updatedAt || ''
    };
  }

  function upsertLocalSignup(signup) {
    if (!signup?.id) return;
    const next = listOpportunitySignups().slice();
    const index = next.findIndex(item => String(item.id) === String(signup.id));
    if (index >= 0) next[index] = signup;
    else next.unshift(signup);
    store()?.saveOpportunitySignups?.(next);
    window.dispatchEvent(new CustomEvent('volunteer-signups-synced'));
  }

  async function reviewSignupViaRpc(signup, status, options = {}) {
    const supabase = client();
    if (!supabase) return { ok: false, reason: 'Supabase is not configured.' };
    const { data, error } = await supabase.rpc('review_opportunity_signup_with_capacity', {
      p_signup_id: signup.id,
      p_status: status,
      p_admin_notes: options.adminNotes || signup.adminNotes || null
    });
    if (error) return { ok: false, reason: error.message };
    const saved = signupFromRpcRow(data, signup);
    if (saved) upsertLocalSignup(saved);
    return { ok: true, signup: saved || signup, capacityAdjusted: saved?.status && saved.status !== status };
  }

  async function reviewOpportunitySignup(signupId, status, options = {}) {
    if (!isAdmin()) return { ok: false, reason: 'Admin access required.' };
    const signup = byId(listOpportunitySignups(), signupId);
    if (!signup) return { ok: false, reason: 'Sign-up not found.' };

    return runMutation('opportunitySignups', async () => {
      let result;
      if (typeof store()?.reviewSupabaseSignupWithCapacity === 'function') {
        const next = {
          ...signup,
          status,
          adminNotes: options.adminNotes || signup.adminNotes || '',
          reviewedAt: now(),
          reviewedBy: currentAdminEmail(),
          updatedAt: now()
        };
        result = await store().reviewSupabaseSignupWithCapacity(next, signup.status || '');
      } else {
        result = await reviewSignupViaRpc(signup, status, options);
      }

      if (!result?.ok) return result || { ok: false, reason: 'Sign-up review failed.' };
      await refreshOpportunitySignups({ adminOnly: true });
      if (typeof store()?.fetchNotifications === 'function') await store().fetchNotifications();
      return result;
    });
  }

  async function reviewAttendanceClaim(claimId, status, options = {}) {
    if (!isAdmin()) return { ok: false, reason: 'Admin access required.' };
    const claim = byId(listAttendanceClaims(), claimId);
    if (!claim) return { ok: false, reason: 'Attendance claim not found.' };
    if (typeof store()?.saveSupabaseAttendanceClaim !== 'function') return { ok: false, reason: 'Attendance review is unavailable.' };

    return runMutation('attendanceClaims', async () => {
      const fallbackHours = status === 'verified'
        ? Number(claim.verifiedHours || claim.claimedHours || options.fallbackHours || 0)
        : Number(claim.verifiedHours || 0);
      const verifiedHours = status === 'verified' || status === 'adjusted'
        ? Math.max(0, Number(options.verifiedHours ?? fallbackHours))
        : fallbackHours;
      const next = {
        ...claim,
        claimStatus: status,
        verifiedHours,
        adminNotes: options.adminNotes || claim.adminNotes || '',
        reviewedBy: currentAdminEmail(),
        reviewedAt: now(),
        updatedAt: now()
      };
      const result = await store().saveSupabaseAttendanceClaim(next, { mode: 'update', review: true });
      if (!result?.ok && !result?.transactional) return result || { ok: false, reason: 'Attendance review failed.' };
      await refreshAttendanceClaims({ adminOnly: true });
      if (typeof store()?.fetchSupabaseOpportunitySignups === 'function') await store().fetchSupabaseOpportunitySignups();
      if (typeof store()?.fetchNotifications === 'function') await store().fetchNotifications();
      return { ...result, claim: next };
    });
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

  function loadScriptOnce(src, attributeName) {
    if (document.querySelector(`script[${attributeName}]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute(attributeName, 'true');
    document.head.appendChild(script);
  }

  function loadAuthRoleHardening() {
    if (window.__authRoleHardeningInstalled) return;
    loadScriptOnce('assets/auth-role-hardening.js', 'data-auth-role-hardening');
  }

  function loadAdminReviewBridge() {
    if (window.__adminReviewDataAccessBridgeInstalled) return;
    loadScriptOnce('assets/admin-review-data-access-bridge.js', 'data-admin-review-data-access-bridge');
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
    reviewOpportunitySignup,
    reviewAttendanceClaim,
    adminQueueCounts,
    countByStatus
  });

  loadAuthRoleHardening();
  loadAdminReviewBridge();
})();
