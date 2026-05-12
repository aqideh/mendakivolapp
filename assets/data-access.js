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
  function appState() {
    try { return typeof state !== 'undefined' ? window.state || state : window.state; } catch (error) { return window.state; }
  }
  function currentOpportunity(opportunityId) {
    return asArray(appState()?.data?.opportunities).find(item => String(item.id) === String(opportunityId));
  }
  function currentUserSignupForOpportunity(opportunityId) {
    const email = session()?.email || '';
    return listOpportunitySignups().find(item => item.email === email && String(item.opportunityId) === String(opportunityId));
  }
  function refreshVisibleSignupViews() {
    if (typeof window.renderOpportunities === 'function') window.renderOpportunities();
    if (typeof window.renderHomeOpportunities === 'function') window.renderHomeOpportunities();
    if (typeof window.phaseTwoRenderDashboardSignups === 'function') window.phaseTwoRenderDashboardSignups();
    if (typeof window.phaseThreeRender === 'function') window.phaseThreeRender();
  }
  function refreshVisibleAttendanceViews() {
    if (typeof window.phaseThreeRender === 'function') window.phaseThreeRender();
    if (typeof window.phaseOneRenderDashboard === 'function') window.phaseOneRenderDashboard();
    if (typeof window.phaseTwoRenderDashboardSignups === 'function') window.phaseTwoRenderDashboardSignups();
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

  function requireSignedIn() {
    if (!session()?.email) throw new Error('Please sign in first.');
    if (!client()) throw new Error('Supabase is not configured.');
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

  const mappers = Object.freeze({ opportunitySignupFromRow, trainingSignupFromRow, attendanceClaimFromRow });

  function upsertLocal(listReader, listWriter, eventName, item) {
    if (!item?.id) return;
    const next = asArray(listReader()).slice();
    const index = next.findIndex(existing => String(existing.id) === String(item.id));
    if (index >= 0) next[index] = item;
    else next.unshift(item);
    listWriter(next);
    window.dispatchEvent(new CustomEvent(eventName));
  }

  function hoursBetween(startValue, endValue) {
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
    return Math.round(((end - start) / 36e5) * 100) / 100;
  }

  function defaultSessionIdForOpportunity(opportunityId) {
    return window.MENDAKIOpportunitySessions?.defaultForOpportunity?.(opportunityId)?.id || null;
  }

  async function validateAttendanceCode(opportunityId, code) {
    requireSignedIn();
    const normalized = String(code || '').trim();
    if (!/^\d{4}$/.test(normalized)) return { ok: false, reason: 'Please enter a valid 4-digit code.' };
    const { data, error } = await client().rpc('validate_attendance_code', {
      p_opportunity_id: String(opportunityId),
      p_code: normalized
    });
    if (error) throw error;
    return data === true ? { ok: true } : { ok: false, reason: 'Invalid facilitator code.' };
  }

  async function recordAttendancePunch(signupId, action = 'checkin', code = '') {
    return runMutation('attendanceClaims', async () => {
      requireSignedIn();
      const signup = byId(listOpportunitySignups(), signupId);
      if (!signup) throw new Error('Sign-up not found.');
      const normalizedAction = action === 'checkout' ? 'checkout' : 'checkin';
      const validation = await validateAttendanceCode(signup.opportunityId, code);
      if (!validation.ok) throw new Error(validation.reason || 'Invalid facilitator code.');
      const timestamp = now();
      const existing = listAttendanceClaims().find(item => String(item.signupId) === String(signup.id));
      if (normalizedAction === 'checkout' && !existing?.checkInAt) throw new Error('No check-in timestamp found. Please check in first.');
      const resolvedSessionId = signup.sessionId || existing?.sessionId || defaultSessionIdForOpportunity(signup.opportunityId);
      if (!resolvedSessionId) throw new Error('No session is linked to this opportunity.');
      const row = {
        id: existing?.id || crypto.randomUUID(),
        signup_id: signup.id,
        opportunity_id: String(signup.opportunityId || ''),
        session_id: resolvedSessionId,
        email: signup.email || session().email || '',
        volunteer_name: signup.volunteerName || session().name || 'Volunteer',
        title: signup.title || '',
        claim_status: normalizedAction === 'checkout' ? 'submitted' : 'checked_in',
        check_in_at: existing?.checkInAt || timestamp,
        check_in_code: normalizedAction === 'checkout' ? existing?.checkInCode || null : String(code).trim(),
        check_out_at: normalizedAction === 'checkout' ? timestamp : null,
        check_out_code: normalizedAction === 'checkout' ? String(code).trim() : null,
        claimed_status: normalizedAction === 'checkout' ? 'attended' : 'checked_in',
        claimed_start: existing?.checkInAt || timestamp,
        claimed_end: normalizedAction === 'checkout' ? timestamp : null,
        claimed_hours: normalizedAction === 'checkout' ? hoursBetween(existing?.checkInAt, timestamp) : 0,
        verified_hours: 0,
        submitted_at: normalizedAction === 'checkout' ? timestamp : null,
        reviewed_by_email: null,
        reviewed_at: null,
        admin_notes: null,
        created_at: existing?.createdAt || timestamp,
        updated_at: timestamp
      };
      const { data, error } = await client().from(canonicalTables.attendanceClaims).upsert(row, { onConflict: 'id' }).select('*').single();
      if (error) throw error;
      const saved = attendanceClaimFromRow(data, existing || {});
      if (!saved) throw new Error('Attendance record was not returned by the database.');
      upsertLocal(listAttendanceClaims, store().saveAttendanceClaims, 'volunteer-attendance-synced', saved);
      await refreshAttendanceClaims();
      refreshVisibleAttendanceViews();
      return { ok: true, claim: saved };
    });
  }

  async function createOpportunitySignup(opportunityId) {
    return runMutation('opportunitySignups', async () => {
      requireSignedIn();
      const opportunity = currentOpportunity(opportunityId);
      if (!opportunity) throw new Error('Opportunity not found.');
      const existing = currentUserSignupForOpportunity(opportunityId);
      if (existing && !['cancelled', 'declined', 'completed'].includes(existing.status)) throw new Error('You already have an active sign-up for this opportunity.');
      const { data, error } = await client().rpc('create_opportunity_signup_with_capacity', {
        p_signup_id: existing?.id || crypto.randomUUID(),
        p_opportunity_id: String(opportunity.id),
        p_volunteer_name: store().getProfile()?.name || session().name || 'Volunteer'
      });
      if (error) throw error;
      const saved = opportunitySignupFromRow(data, existing || {});
      if (!saved) throw new Error('Sign-up was not returned by the database.');
      upsertLocal(listOpportunitySignups, store().saveOpportunitySignups, 'volunteer-signups-synced', saved);
      await refreshOpportunitySignups();
      refreshVisibleSignupViews();
      return { ok: true, signup: saved };
    });
  }

  async function cancelOpportunitySignup(opportunityId) {
    return runMutation('opportunitySignups', async () => {
      requireSignedIn();
      const signup = currentUserSignupForOpportunity(opportunityId);
      if (!signup) throw new Error('Sign-up not found.');
      if (!['pending_review', 'registered', 'confirmed', 'waitlisted'].includes(signup.status)) throw new Error('This sign-up can no longer be cancelled.');
      const { data, error } = await client().rpc('cancel_opportunity_signup', { p_signup_id: signup.id, p_cancellation_reason: null });
      if (error) throw error;
      const saved = opportunitySignupFromRow(data, signup);
      if (!saved) throw new Error('Cancellation was not returned by the database.');
      upsertLocal(listOpportunitySignups, store().saveOpportunitySignups, 'volunteer-signups-synced', saved);
      await refreshOpportunitySignups();
      refreshVisibleSignupViews();
      return { ok: true, signup: saved };
    });
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
    createOpportunitySignup,
    cancelOpportunitySignup,
    validateAttendanceCode,
    recordAttendancePunch,
    reviewOpportunitySignup,
    reviewAttendanceClaim,
    reviewTrainingSignup,
    adminQueueCounts,
    countByStatus
  });
})();
