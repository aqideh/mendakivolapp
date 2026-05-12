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

  const deprecatedTables = Object.freeze([]);
  const state = { loading: new Set(), lastError: new Map(), lastRefreshedAt: new Map() };

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function asArray(value) { return Array.isArray(value) ? value : []; }
  function session() { return store()?.getSession?.() || null; }
  function now() { return new Date().toISOString(); }
  function byId(items, id) { return asArray(items).find(item => String(item.id) === String(id)); }
  function isAdmin() {
    const role = String(session()?.role || '').toLowerCase();
    return role === 'admin' || role === 'super_admin';
  }

  function emit(domain) {
    window.dispatchEvent(new CustomEvent('mendaki-data-access-state', { detail: snapshot(domain) }));
  }

  function setLoading(domain, loading) {
    if (loading) state.loading.add(domain);
    else state.loading.delete(domain);
    emit(domain);
  }

  function setError(domain, error) {
    if (error) state.lastError.set(domain, error?.message || String(error));
    else state.lastError.delete(domain);
  }

  function markRefreshed(domain) { state.lastRefreshedAt.set(domain, now()); }

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

  async function runRefresh(domain, refresher) {
    if (typeof refresher !== 'function') throw new Error(`${domain} refresh is not configured.`);
    setLoading(domain, true);
    setError(domain, null);
    try {
      const result = await refresher();
      markRefreshed(domain);
      return asArray(result);
    } catch (error) {
      setError(domain, error);
      throw error;
    } finally {
      setLoading(domain, false);
    }
  }

  async function runMutation(domain, operation) {
    setLoading(domain, true);
    setError(domain, null);
    try {
      const result = await operation();
      markRefreshed(domain);
      return result || { ok: true };
    } catch (error) {
      setError(domain, error);
      return { ok: false, reason: error.message || String(error) };
    } finally {
      setLoading(domain, false);
    }
  }

  function listOpportunitySignups() { return asArray(store()?.getOpportunitySignups?.()); }
  function listAttendanceClaims() { return asArray(store()?.getAttendanceClaims?.()); }
  function listTrainingSignups() { return asArray(store()?.getTrainingSignups?.()); }

  async function refreshOpportunitySignups() {
    if (!session()?.email) return listOpportunitySignups();
    return runRefresh('opportunitySignups', store()?.fetchSupabaseOpportunitySignups);
  }

  async function refreshAttendanceClaims() {
    if (!session()?.email) return listAttendanceClaims();
    return runRefresh('attendanceClaims', store()?.fetchSupabaseAttendanceClaims);
  }

  async function refreshTrainingSignups() {
    if (!session()?.email) return listTrainingSignups();
    return runRefresh('trainingSignups', store()?.fetchSupabaseTrainingSignups);
  }

  async function refreshAdminQueue(area) {
    if (area === 'signups') return refreshOpportunitySignups();
    if (area === 'attendance') return refreshAttendanceClaims();
    if (area === 'training') return refreshTrainingSignups();
    return [];
  }

  function requireAdmin() {
    if (!isAdmin()) throw new Error('Admin access required.');
    if (!client()) throw new Error('Supabase is not configured.');
  }

  function opportunitySignupFromRow(row, fallback = {}) {
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

  function trainingSignupFromRow(row, fallback = {}) {
    if (!row) return null;
    return {
      id: row.id,
      trainingId: String(row.training_id || fallback.trainingId || ''),
      trainingSessionId: row.training_session_id || fallback.trainingSessionId || '',
      appUserId: row.volunteer_user_id || fallback.appUserId || '',
      email: row.email || fallback.email || '',
      volunteerName: row.volunteer_name || fallback.volunteerName || 'Volunteer',
      title: row.title || fallback.title || '',
      date: row.session_date || fallback.date || '',
      time: row.time || fallback.time || '',
      location: row.location || fallback.location || '',
      trainer: row.trainer || fallback.trainer || '',
      status: row.status || fallback.status || 'registered',
      signedUpAt: row.signed_up_at || fallback.signedUpAt || '',
      completedAt: row.completed_at || fallback.completedAt || '',
      cancelledAt: row.cancelled_at || fallback.cancelledAt || '',
      reviewedBy: row.reviewed_by_email || fallback.reviewedBy || '',
      reviewedAt: row.reviewed_at || fallback.reviewedAt || '',
      adminNotes: row.admin_notes || fallback.adminNotes || '',
      createdAt: row.created_at || fallback.createdAt || '',
      updatedAt: row.updated_at || fallback.updatedAt || ''
    };
  }

  function attendanceClaimFromRow(row, fallback = {}) {
    if (!row) return null;
    return {
      id: row.id,
      signupId: row.signup_id || fallback.signupId || '',
      opportunityId: String(row.opportunity_id || fallback.opportunityId || ''),
      sessionId: row.session_id || fallback.sessionId || '',
      email: row.email || fallback.email || '',
      volunteerName: row.volunteer_name || fallback.volunteerName || 'Volunteer',
      title: row.title || fallback.title || '',
      claimStatus: row.claim_status || fallback.claimStatus || 'pending_submission',
      checkInAt: row.check_in_at || fallback.checkInAt || '',
      checkInCode: row.check_in_code || fallback.checkInCode || '',
      checkOutAt: row.check_out_at || fallback.checkOutAt || '',
      checkOutCode: row.check_out_code || fallback.checkOutCode || '',
      claimedStatus: row.claimed_status || fallback.claimedStatus || '',
      claimedStart: row.claimed_start || fallback.claimedStart || '',
      claimedEnd: row.claimed_end || fallback.claimedEnd || '',
      claimedHours: Number(row.claimed_hours ?? fallback.claimedHours ?? 0),
      verifiedHours: Number(row.verified_hours ?? fallback.verifiedHours ?? 0),
      submittedAt: row.submitted_at || fallback.submittedAt || '',
      reviewedBy: row.reviewed_by_email || fallback.reviewedBy || '',
      reviewedAt: row.reviewed_at || fallback.reviewedAt || '',
      adminNotes: row.admin_notes || fallback.adminNotes || '',
      clarificationResponse: row.clarification_response || fallback.clarificationResponse || '',
      clarificationRespondedAt: row.clarification_responded_at || fallback.clarificationRespondedAt || '',
      createdAt: row.created_at || fallback.createdAt || '',
      updatedAt: row.updated_at || fallback.updatedAt || ''
    };
  }

  const mappers = Object.freeze({
    opportunitySignupFromRow,
    trainingSignupFromRow,
    attendanceClaimFromRow
  });

  function upsertLocal(listReader, listWriter, eventName, item) {
    if (!item?.id) return;
    const next = asArray(listReader()).slice();
    const index = next.findIndex(existing => String(existing.id) === String(item.id));
    if (index >= 0) next[index] = item;
    else next.unshift(item);
    listWriter(next);
    window.dispatchEvent(new CustomEvent(eventName));
  }

  async function reviewOpportunitySignup(signupId, status, options = {}) {
    return runMutation('opportunitySignups', async () => {
      requireAdmin();
      const signup = byId(listOpportunitySignups(), signupId);
      if (!signup) throw new Error('Sign-up not found.');
      const { data, error } = await client().rpc('review_opportunity_signup_with_capacity', {
        p_signup_id: signup.id,
        p_status: status,
        p_admin_notes: options.adminNotes || signup.adminNotes || null
      });
      if (error) throw error;
      const saved = opportunitySignupFromRow(data, signup);
      if (saved) upsertLocal(listOpportunitySignups, store().saveOpportunitySignups, 'volunteer-signups-synced', saved);
      await refreshOpportunitySignups();
      await store()?.fetchNotifications?.();
      return { ok: true, signup: saved || signup, capacityAdjusted: Boolean(saved?.status && saved.status !== status) };
    });
  }

  function attendanceActionForStatus(status) {
    if (status === 'verified') return 'verify';
    if (status === 'adjusted') return 'adjust';
    if (status === 'clarification_requested') return 'clarify';
    if (status === 'rejected') return 'reject';
    throw new Error(`Unsupported attendance status: ${status}`);
  }

  async function reviewAttendanceClaim(claimId, status, options = {}) {
    return runMutation('attendanceClaims', async () => {
      requireAdmin();
      const claim = byId(listAttendanceClaims(), claimId);
      if (!claim) throw new Error('Attendance claim not found.');
      const fallbackHours = status === 'verified' || status === 'adjusted'
        ? Number(options.verifiedHours ?? claim.verifiedHours ?? claim.claimedHours ?? 0)
        : 0;
      const { data, error } = await client().rpc('review_attendance_claim_transactional', {
        p_claim_id: claim.id,
        p_action: attendanceActionForStatus(status),
        p_verified_hours: Math.max(0, Number(fallbackHours || 0)),
        p_admin_notes: options.adminNotes || claim.adminNotes || null
      });
      if (error) throw error;
      await refreshAttendanceClaims();
      await refreshOpportunitySignups();
      await store()?.fetchNotifications?.();
      return { ok: true, transactional: true, result: data };
    });
  }

  async function reviewTrainingSignup(signupId, status, options = {}) {
    return runMutation('trainingSignups', async () => {
      requireAdmin();
      const signup = byId(listTrainingSignups(), signupId);
      if (!signup) throw new Error('Training sign-up not found.');
      const { data, error } = await client().rpc('review_training_signup_lifecycle', {
        p_signup_id: signup.id,
        p_status: status,
        p_admin_notes: options.adminNotes || signup.adminNotes || null
      });
      if (error) throw error;
      const saved = trainingSignupFromRow(data, signup);
      if (saved) upsertLocal(listTrainingSignups, store().saveTrainingSignups, 'volunteer-training-signups-synced', saved);
      if (saved?.status === 'completed') await store()?.notifyTrainingCompletion?.(saved);
      await refreshTrainingSignups();
      await store()?.fetchNotifications?.();
      return { ok: true, signup: saved || signup };
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

  window.MENDAKIDataAccess = Object.freeze({
    canonicalTables,
    deprecatedTables,
    mappers,
    snapshot,
    listOpportunitySignups,
    listAttendanceClaims,
    listTrainingSignups,
    refreshOpportunitySignups,
    refreshAttendanceClaims,
    refreshTrainingSignups,
    refreshAdminQueue,
    reviewOpportunitySignup,
    reviewAttendanceClaim,
    reviewTrainingSignup,
    adminQueueCounts,
    countByStatus
  });
})();
