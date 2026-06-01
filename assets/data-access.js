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
  const state = { loading: new Set(), lastError: new Map(), lastRefreshedAt: new Map(), notifications: [] };

  function store() { return window.VolunteerDataStore; }
  function client() { return store().authState.supabase; }
  function session() { return store().getSession(); }
  function asArray(value) { return Array.isArray(value) ? value : []; }
  function now() { return new Date().toISOString(); }
  function byId(items, id) { return asArray(items).find(item => String(item.id) === String(id)); }
  function role() { return String(session()?.role || '').toLowerCase(); }
  function isAdmin() { return role() === 'admin' || role() === 'super_admin'; }
  function appData() { return window.state.data; }

  function setLoading(domain, loading) {
    if (loading) state.loading.add(domain);
    else state.loading.delete(domain);
    window.dispatchEvent(new CustomEvent('mendaki-data-access-state', { detail: snapshot(domain) }));
  }
  function setError(domain, error) {
    if (error) state.lastError.set(domain, error.message || String(error));
    else state.lastError.delete(domain);
  }
  function snapshot(domain = '') {
    return { domain, loading: domain ? state.loading.has(domain) : state.loading.size > 0, error: domain ? state.lastError.get(domain) || '' : '', lastRefreshedAt: domain ? state.lastRefreshedAt.get(domain) || '' : '', canonicalTables, deprecatedTables };
  }
  async function runRefresh(domain, refresher) {
    if (typeof refresher !== 'function') throw new Error(`${domain} refresh is not configured.`);
    setLoading(domain, true); setError(domain, null);
    try { const result = await refresher(); state.lastRefreshedAt.set(domain, now()); return asArray(result); }
    catch (error) { setError(domain, error); throw error; }
    finally { setLoading(domain, false); }
  }
  async function runMutation(domain, operation) {
    setLoading(domain, true); setError(domain, null);
    try { const result = await operation(); state.lastRefreshedAt.set(domain, now()); return result || { ok: true }; }
    catch (error) { setError(domain, error); return { ok: false, reason: error.message || String(error) }; }
    finally { setLoading(domain, false); }
  }
  function requireSignedIn() { if (!session()?.email) throw new Error('Please sign in first.'); if (!client()) throw new Error('Supabase is not configured.'); }
  function requireAdmin() { if (!isAdmin()) throw new Error('Admin access required.'); if (!client()) throw new Error('Supabase is not configured.'); }

  function listOpportunitySignups() { return asArray(store().getOpportunitySignups()); }
  function listAttendanceClaims() { return asArray(store().getAttendanceClaims()); }
  function listTrainingSignups() { return asArray(store().getTrainingSignups()); }
  function listTrainingSessions() { return asArray(appData().trainings); }
  function listNotifications() { return state.notifications.slice(); }
  async function refreshOpportunitySignups() { return session()?.email ? runRefresh('opportunitySignups', store().fetchSupabaseOpportunitySignups) : listOpportunitySignups(); }
  async function refreshAttendanceClaims() { return session()?.email ? runRefresh('attendanceClaims', store().fetchSupabaseAttendanceClaims) : listAttendanceClaims(); }
  async function refreshTrainingSignups() { return session()?.email ? runRefresh('trainingSignups', store().fetchSupabaseTrainingSignups) : listTrainingSignups(); }
  async function refreshAdminQueue(area) { if (area === 'signups') return refreshOpportunitySignups(); if (area === 'attendance') return refreshAttendanceClaims(); if (area === 'training') return refreshTrainingSignups(); return []; }

  async function fetchAdminTrainingSessions() {
    return runRefresh('trainingSessions', async () => {
      requireAdmin();
      const { data, error } = await client()
        .from(canonicalTables.trainingSessions)
        .select('id,title,description,trainer,session_date,time,location,capacity,waitlist_enabled,status,required_for,parent_training_id,session_title,starts_at,ends_at,default_hours,is_session_instance')
        .order('parent_training_id', { ascending: true })
        .order('starts_at', { ascending: true, nullsFirst: false })
        .order('session_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return asArray(data);
    });
  }

  async function refreshTrainingSessions() {
    return runRefresh('trainingSessions', async () => {
      requireAdmin();
      if (typeof store().applySupabaseTrainingSessions === 'function') await store().applySupabaseTrainingSessions();
      window.dispatchEvent(new CustomEvent('volunteer-training-sessions-synced'));
      return listTrainingSessions();
    });
  }

  async function saveAdminTrainingSession(row) {
    return runMutation('trainingSessions', async () => {
      requireAdmin();
      if (!row?.id) throw new Error('Training session id is required.');
      const { data, error } = await client().from(canonicalTables.trainingSessions).upsert(row, { onConflict: 'id' }).select('*').single();
      if (error) throw error;
      await refreshTrainingSessions();
      return { ok: true, row: data };
    });
  }

  async function deleteAdminTrainingSession(id) {
    return runMutation('trainingSessions', async () => {
      requireAdmin();
      if (!id) throw new Error('Training session id is required.');
      const { error } = await client().from(canonicalTables.trainingSessions).delete().eq('id', id);
      if (error) throw error;
      await refreshTrainingSessions();
      return { ok: true };
    });
  }

  function opportunitySignupFromRow(row, previous = {}) {
    if (!row) return null;
    return { id: row.id, opportunityId: String(row.opportunity_id || previous.opportunityId || ''), sessionId: row.session_id || previous.sessionId || '', email: row.email || previous.email || '', volunteerName: row.volunteer_name || previous.volunteerName || 'Volunteer', title: row.title || previous.title || '', type: row.type || previous.type || '', category: row.category || previous.category || '', time: row.time || previous.time || '', location: row.location || previous.location || '', commitment: row.commitment || previous.commitment || '', hours: Number(row.hours ?? previous.hours ?? 0), status: row.status || previous.status || 'pending_review', signedUpAt: row.signed_up_at || previous.signedUpAt || '', reviewedAt: row.reviewed_at || previous.reviewedAt || '', reviewedBy: row.reviewed_by_email || previous.reviewedBy || '', adminNotes: row.admin_notes || previous.adminNotes || '', confirmedAt: row.confirmed_at || previous.confirmedAt || '', waitlistedAt: row.waitlisted_at || previous.waitlistedAt || '', declinedAt: row.declined_at || previous.declinedAt || '', cancelledAt: row.cancelled_at || previous.cancelledAt || '', completedAt: row.completed_at || previous.completedAt || '', verifiedHours: Number(row.verified_hours ?? previous.verifiedHours ?? 0), updatedAt: row.updated_at || previous.updatedAt || '' };
  }
  function trainingSignupFromRow(row, previous = {}) {
    if (!row) return null;
    return { id: row.id, trainingId: String(row.training_id || previous.trainingId || ''), trainingSessionId: row.training_session_id || previous.trainingSessionId || '', appUserId: row.volunteer_user_id || previous.appUserId || '', email: row.email || previous.email || '', volunteerName: row.volunteer_name || previous.volunteerName || 'Volunteer', title: row.title || previous.title || '', date: row.session_date || previous.date || '', time: row.time || previous.time || '', location: row.location || previous.location || '', trainer: row.trainer || previous.trainer || '', status: row.status || previous.status || 'registered', signedUpAt: row.signed_up_at || previous.signedUpAt || '', completedAt: row.completed_at || previous.completedAt || '', cancelledAt: row.cancelled_at || previous.cancelledAt || '', reviewedBy: row.reviewed_by_email || previous.reviewedBy || '', reviewedAt: row.reviewed_at || previous.reviewedAt || '', adminNotes: row.admin_notes || previous.adminNotes || '', createdAt: row.created_at || previous.createdAt || '', updatedAt: row.updated_at || previous.updatedAt || '' };
  }
  function attendanceClaimFromRow(row, previous = {}) {
    if (!row) return null;
    return { id: row.id, signupId: row.signup_id || previous.signupId || '', opportunityId: String(row.opportunity_id || previous.opportunityId || ''), sessionId: row.session_id || previous.sessionId || '', email: row.email || previous.email || '', volunteerName: row.volunteer_name || previous.volunteerName || 'Volunteer', title: row.title || previous.title || '', claimStatus: row.claim_status || previous.claimStatus || 'pending_submission', checkInAt: row.check_in_at || previous.checkInAt || '', checkInCode: row.check_in_code || previous.checkInCode || '', checkOutAt: row.check_out_at || previous.checkOutAt || '', checkOutCode: row.check_out_code || previous.checkOutCode || '', claimedStatus: row.claimed_status || previous.claimedStatus || '', claimedStart: row.claimed_start || previous.claimedStart || '', claimedEnd: row.claimed_end || previous.claimedEnd || '', claimedHours: Number(row.claimed_hours ?? previous.claimedHours ?? 0), verifiedHours: Number(row.verified_hours ?? previous.verifiedHours ?? 0), submittedAt: row.submitted_at || previous.submittedAt || '', reviewedBy: row.reviewed_by_email || previous.reviewedBy || '', reviewedAt: row.reviewed_at || previous.reviewedAt || '', adminNotes: row.admin_notes || previous.adminNotes || '', clarificationResponse: row.clarification_response || previous.clarificationResponse || '', clarificationRespondedAt: row.clarification_responded_at || previous.clarificationRespondedAt || '', createdAt: row.created_at || previous.createdAt || '', updatedAt: row.updated_at || previous.updatedAt || '' };
  }
  function notificationFromRow(row) {
    if (!row) return null;
    return { id: row.id, recipientEmail: row.recipient_email || '', recipientRole: row.recipient_role || 'volunteer', title: row.title || '', message: row.message || '', type: row.notification_type || 'general', relatedTable: row.related_table || '', relatedId: row.related_id || '', groupKey: row.group_key || '', actionUrl: row.action_url || '', metadata: row.metadata || {}, isRead: Boolean(row.is_read), createdAt: row.created_at || '', readAt: row.read_at || '', clearedAt: row.cleared_at || '' };
  }
  const mappers = Object.freeze({ opportunitySignupFromRow, trainingSignupFromRow, attendanceClaimFromRow, notificationFromRow });

  function upsertLocal(listReader, listWriter, eventName, item) {
    if (!item?.id) throw new Error('Cannot save a record without an id.');
    const next = asArray(listReader()).slice();
    const index = next.findIndex(existing => String(existing.id) === String(item.id));
    if (index >= 0) next[index] = item; else next.unshift(item);
    listWriter(next); window.dispatchEvent(new CustomEvent(eventName));
  }
  function refreshSignupViews() { if (typeof window.renderOpportunities === 'function') window.renderOpportunities(); if (typeof window.renderHomeOpportunities === 'function') window.renderHomeOpportunities(); if (typeof window.phaseTwoRenderDashboardSignups === 'function') window.phaseTwoRenderDashboardSignups(); if (typeof window.phaseThreeRender === 'function') window.phaseThreeRender(); }
  function refreshAttendanceViews() { if (typeof window.phaseThreeRender === 'function') window.phaseThreeRender(); if (typeof window.phaseOneRenderDashboard === 'function') window.phaseOneRenderDashboard(); if (typeof window.phaseTwoRenderDashboardSignups === 'function') window.phaseTwoRenderDashboardSignups(); }
  function refreshTrainingViews() { if (typeof window.phaseFourRender === 'function') window.phaseFourRender(); if (typeof window.phaseOneRenderDashboard === 'function') window.phaseOneRenderDashboard(); }
  function dispatchNotificationsChanged() { window.dispatchEvent(new CustomEvent('volunteer-notifications-synced', { detail: { notifications: listNotifications() } })); }

  function currentOpportunity(opportunityId) { return asArray(appData().opportunities).find(item => String(item.id) === String(opportunityId)); }
  function currentTraining(trainingId) { return asArray(appData().trainings).find(item => String(item.id) === String(trainingId)); }
  function currentOpportunitySignup(opportunityId) { return listOpportunitySignups().find(item => item.email === session().email && String(item.opportunityId) === String(opportunityId)); }
  function currentTrainingSignup(trainingId) { return listTrainingSignups().find(item => item.email === session().email && String(item.trainingId) === String(trainingId)); }

  function hoursBetween(startValue, endValue) { const start = new Date(startValue); const end = new Date(endValue); if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0; return Math.round(((end - start) / 36e5) * 100) / 100; }
  function defaultSessionIdForOpportunity(opportunityId) { return window.MENDAKIOpportunitySessions?.defaultForOpportunity?.(opportunityId)?.id || null; }

  async function fetchNotifications() {
    return runRefresh('notifications', async () => {
      requireSignedIn();
      const { data, error } = await client().from(canonicalTables.notifications).select('*').is('cleared_at', null).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      const persisted = asArray(data).map(notificationFromRow).filter(Boolean);
      state.notifications = isAdmin() ? [...buildAdminTaskNotifications(), ...persisted.filter(item => item.type !== 'admin_task')] : persisted;
      dispatchNotificationsChanged();
      return state.notifications;
    });
  }
  async function createNotification(notification) {
    return runMutation('notifications', async () => {
      if (!notification?.recipientEmail || !notification?.title) throw new Error('Notification recipient and title are required.');
      const groupKey = notification.groupKey || [notification.recipientEmail, notification.type, notification.relatedTable, notification.relatedId].filter(Boolean).join(':') || null;
      const { data, error } = await client().rpc('create_app_notification', { p_recipient_email: notification.recipientEmail || null, p_recipient_role: notification.recipientRole || 'volunteer', p_title: notification.title, p_message: notification.message || '', p_notification_type: notification.type || 'general', p_related_table: notification.relatedTable || null, p_related_id: notification.relatedId ? String(notification.relatedId) : null, p_group_key: groupKey, p_action_url: notification.actionUrl || null, p_metadata: notification.metadata || {} });
      if (error) throw error;
      if (data?.ok === false) return data;
      await fetchNotifications();
      return { ok: true, data };
    });
  }
  async function updateNotifications(ids, payload) {
    return runMutation('notifications', async () => {
      const targetIds = asArray(ids).filter(id => id && !String(id).startsWith('admin-pending-'));
      if (!targetIds.length) return { ok: true };
      const { error } = await client().from(canonicalTables.notifications).update(payload).in('id', targetIds);
      if (error) throw error;
      await fetchNotifications();
      return { ok: true };
    });
  }
  async function markNotificationRead(id) {
    const existing = state.notifications.find(item => String(item.id) === String(id));
    if (!existing) return { ok: true };
    if (String(id).startsWith('admin-pending-')) {
      state.notifications = state.notifications.map(item => String(item.id) === String(id) ? { ...item, isRead: true, readAt: item.readAt || now() } : item);
      dispatchNotificationsChanged();
      return { ok: true };
    }
    return updateNotifications([id], { is_read: true, read_at: now() });
  }
  async function markAllNotificationsRead() {
    const ids = state.notifications.filter(item => !item.isRead && !item.clearedAt).map(item => item.id);
    const virtualIds = ids.filter(id => String(id).startsWith('admin-pending-'));
    if (virtualIds.length) state.notifications = state.notifications.map(item => virtualIds.includes(item.id) ? { ...item, isRead: true, readAt: item.readAt || now() } : item);
    return updateNotifications(ids, { is_read: true, read_at: now() });
  }
  async function clearAllNotifications() {
    const timestamp = now();
    const persistedIds = state.notifications.filter(item => !item.clearedAt && !String(item.id).startsWith('admin-pending-')).map(item => item.id);
    if (persistedIds.length) {
      const result = await updateNotifications(persistedIds, { is_read: true, read_at: timestamp, cleared_at: timestamp });
      if (!result.ok) return result;
    }
    state.notifications = [];
    dispatchNotificationsChanged();
    return { ok: true };
  }
  function buildAdminTaskNotifications() {
    if (!isAdmin()) return [];
    const pendingSignups = listOpportunitySignups().filter(item => item.status === 'pending_review').length;
    const pendingAttendance = listAttendanceClaims().filter(item => item.claimStatus === 'submitted').length;
    const pendingTraining = listTrainingSignups().filter(item => item.status === 'registered').length;
    const createdAt = now();
    return [
      pendingSignups ? { id: 'admin-pending-signups', title: 'Pending sign-up reviews', message: `${pendingSignups} opportunity sign-up${pendingSignups === 1 ? '' : 's'} awaiting review.`, type: 'admin_task', relatedTable: canonicalTables.opportunitySignups, isRead: false, createdAt } : null,
      pendingAttendance ? { id: 'admin-pending-attendance', title: 'Attendance awaiting verification', message: `${pendingAttendance} attendance record${pendingAttendance === 1 ? '' : 's'} awaiting verification.`, type: 'admin_task', relatedTable: canonicalTables.attendanceClaims, isRead: false, createdAt } : null,
      pendingTraining ? { id: 'admin-pending-training', title: 'Training completion review', message: `${pendingTraining} training sign-up${pendingTraining === 1 ? '' : 's'} may need completion review.`, type: 'admin_task', relatedTable: canonicalTables.trainingSignups, isRead: false, createdAt } : null
    ].filter(Boolean);
  }
  function refreshAdminTaskNotifications() {
    const persisted = state.notifications.filter(item => item.type !== 'admin_task');
    state.notifications = isAdmin() ? [...buildAdminTaskNotifications(), ...persisted] : persisted;
    dispatchNotificationsChanged();
    return state.notifications;
  }

  async function createOpportunitySignup(opportunityId) { return runMutation('opportunitySignups', async () => { requireSignedIn(); const opportunity = currentOpportunity(opportunityId); if (!opportunity) throw new Error('Opportunity not found.'); const existing = currentOpportunitySignup(opportunityId); if (existing && !['cancelled', 'declined', 'completed'].includes(existing.status)) throw new Error('You already have an active sign-up for this opportunity.'); const { data, error } = await client().rpc('create_opportunity_signup_with_capacity', { p_signup_id: existing?.id || crypto.randomUUID(), p_opportunity_id: String(opportunity.id), p_volunteer_name: store().getProfile()?.name || session().name || 'Volunteer' }); if (error) throw error; const saved = opportunitySignupFromRow(data, existing || {}); if (!saved) throw new Error('Sign-up was not returned by the database.'); upsertLocal(listOpportunitySignups, store().saveOpportunitySignups, 'volunteer-signups-synced', saved); await refreshOpportunitySignups(); refreshSignupViews(); return { ok: true, signup: saved }; }); }
  async function cancelOpportunitySignup(opportunityId) { return runMutation('opportunitySignups', async () => { requireSignedIn(); const signup = currentOpportunitySignup(opportunityId); if (!signup) throw new Error('Sign-up not found.'); if (!['pending_review', 'registered', 'confirmed', 'waitlisted'].includes(signup.status)) throw new Error('This sign-up can no longer be cancelled.'); const { data, error } = await client().rpc('cancel_opportunity_signup', { p_signup_id: signup.id, p_cancellation_reason: null }); if (error) throw error; const saved = opportunitySignupFromRow(data, signup); if (!saved) throw new Error('Cancellation was not returned by the database.'); upsertLocal(listOpportunitySignups, store().saveOpportunitySignups, 'volunteer-signups-synced', saved); await refreshOpportunitySignups(); refreshSignupViews(); return { ok: true, signup: saved }; }); }
  async function createTrainingSignup(trainingId) { return runMutation('trainingSignups', async () => { requireSignedIn(); const training = currentTraining(trainingId); if (!training) throw new Error('Training session not found.'); const existing = currentTrainingSignup(trainingId); if (existing && !['cancelled', 'no_show'].includes(existing.status)) throw new Error('You already have an active training sign-up.'); const draft = { id: existing?.id || crypto.randomUUID(), trainingId: String(training.id), email: session().email, volunteerName: store().getProfile()?.name || session().name || 'Volunteer', title: training.title || '', date: training.date || '', time: training.time || '', location: training.location || '', trainer: training.trainer || '', status: 'registered', signedUpAt: existing?.signedUpAt || now(), updatedAt: now() }; const { data, error } = await client().rpc('create_training_signup_with_capacity', { p_signup_id: draft.id, p_training_id: draft.trainingId, p_volunteer_name: draft.volunteerName }); if (error) throw error; const saved = trainingSignupFromRow(data, draft); if (!saved) throw new Error('Training sign-up was not returned by the database.'); upsertLocal(listTrainingSignups, store().saveTrainingSignups, 'volunteer-training-signups-synced', saved); await refreshTrainingSignups(); refreshTrainingViews(); return { ok: true, signup: saved }; }); }
  async function cancelTrainingSignup(trainingId) { return runMutation('trainingSignups', async () => { requireSignedIn(); const signup = currentTrainingSignup(trainingId); if (!signup) throw new Error('Training sign-up not found.'); if (!['registered', 'waitlisted'].includes(signup.status)) throw new Error('This training sign-up can no longer be cancelled.'); const { data, error } = await client().rpc('cancel_training_signup', { p_signup_id: signup.id, p_cancellation_reason: null }); if (error) throw error; const saved = trainingSignupFromRow(data, signup); if (!saved) throw new Error('Cancellation was not returned by the database.'); upsertLocal(listTrainingSignups, store().saveTrainingSignups, 'volunteer-training-signups-synced', saved); await refreshTrainingSignups(); refreshTrainingViews(); return { ok: true, signup: saved }; }); }

  async function validateAttendanceCode(opportunityId, code) { requireSignedIn(); const normalized = String(code || '').trim(); if (!/^\d{4}$/.test(normalized)) return { ok: false, reason: 'Please enter a valid 4-digit code.' }; const { data, error } = await client().rpc('validate_attendance_code', { p_opportunity_id: String(opportunityId), p_code: normalized }); if (error) throw error; return data === true ? { ok: true } : { ok: false, reason: 'Invalid facilitator code.' }; }
  async function recordAttendancePunch(signupId, action = 'checkin', code = '') { return runMutation('attendanceClaims', async () => { requireSignedIn(); const signup = byId(listOpportunitySignups(), signupId); if (!signup) throw new Error('Sign-up not found.'); const normalizedAction = action === 'checkout' ? 'checkout' : 'checkin'; const validation = await validateAttendanceCode(signup.opportunityId, code); if (!validation.ok) throw new Error(validation.reason || 'Invalid facilitator code.'); const timestamp = now(); const existing = listAttendanceClaims().find(item => String(item.signupId) === String(signup.id)); if (normalizedAction === 'checkout' && !existing?.checkInAt) throw new Error('No check-in timestamp found. Please check in first.'); const resolvedSessionId = signup.sessionId || existing?.sessionId || defaultSessionIdForOpportunity(signup.opportunityId); if (!resolvedSessionId) throw new Error('No session is linked to this opportunity.'); const row = { id: existing?.id || crypto.randomUUID(), signup_id: signup.id, opportunity_id: String(signup.opportunityId || ''), session_id: resolvedSessionId, email: signup.email || session().email || '', volunteer_name: signup.volunteerName || session().name || 'Volunteer', title: signup.title || '', claim_status: normalizedAction === 'checkout' ? 'submitted' : 'checked_in', check_in_at: existing?.checkInAt || timestamp, check_in_code: normalizedAction === 'checkout' ? existing?.checkInCode || null : String(code).trim(), check_out_at: normalizedAction === 'checkout' ? timestamp : null, check_out_code: normalizedAction === 'checkout' ? String(code).trim() : null, claimed_status: normalizedAction === 'checkout' ? 'attended' : 'checked_in', claimed_start: existing?.checkInAt || timestamp, claimed_end: normalizedAction === 'checkout' ? timestamp : null, claimed_hours: normalizedAction === 'checkout' ? hoursBetween(existing?.checkInAt, timestamp) : 0, verified_hours: 0, submitted_at: normalizedAction === 'checkout' ? timestamp : null, reviewed_by_email: null, reviewed_at: null, admin_notes: null, created_at: existing?.createdAt || timestamp, updated_at: timestamp }; const { data, error } = await client().from(canonicalTables.attendanceClaims).upsert(row, { onConflict: 'id' }).select('*').single(); if (error) throw error; const saved = attendanceClaimFromRow(data, existing || {}); if (!saved) throw new Error('Attendance record was not returned by the database.'); upsertLocal(listAttendanceClaims, store().saveAttendanceClaims, 'volunteer-attendance-synced', saved); await refreshAttendanceClaims(); refreshAttendanceViews(); return { ok: true, claim: saved }; }); }
  async function reviewOpportunitySignup(signupId, status, options = {}) { return runMutation('opportunitySignups', async () => { requireAdmin(); const signup = byId(listOpportunitySignups(), signupId); if (!signup) throw new Error('Sign-up not found.'); const { data, error } = await client().rpc('review_opportunity_signup_with_capacity', { p_signup_id: signup.id, p_status: status, p_admin_notes: options.adminNotes || signup.adminNotes || null }); if (error) throw error; const saved = opportunitySignupFromRow(data, signup); if (saved) upsertLocal(listOpportunitySignups, store().saveOpportunitySignups, 'volunteer-signups-synced', saved); await refreshOpportunitySignups(); await fetchNotifications(); return { ok: true, signup: saved || signup, capacityAdjusted: Boolean(saved?.status && saved.status !== status) }; }); }
  function attendanceActionForStatus(status) { if (status === 'verified') return 'verify'; if (status === 'adjusted') return 'adjust'; if (status === 'clarification_requested') return 'clarify'; if (status === 'rejected') return 'reject'; throw new Error(`Unsupported attendance status: ${status}`); }
  async function reviewAttendanceClaim(claimId, status, options = {}) { return runMutation('attendanceClaims', async () => { requireAdmin(); const claim = byId(listAttendanceClaims(), claimId); if (!claim) throw new Error('Attendance claim not found.'); const verifiedHours = ['verified', 'adjusted'].includes(status) ? Number(options.verifiedHours ?? claim.verifiedHours ?? claim.claimedHours ?? 0) : 0; const { data, error } = await client().rpc('review_attendance_claim_transactional', { p_claim_id: claim.id, p_action: attendanceActionForStatus(status), p_verified_hours: Math.max(0, Number(verifiedHours || 0)), p_admin_notes: options.adminNotes || claim.adminNotes || null }); if (error) throw error; await refreshAttendanceClaims(); await refreshOpportunitySignups(); await fetchNotifications(); return { ok: true, transactional: true, result: data }; }); }
  async function reviewTrainingSignup(signupId, status, options = {}) { return runMutation('trainingSignups', async () => { requireAdmin(); const signup = byId(listTrainingSignups(), signupId); if (!signup) throw new Error('Training sign-up not found.'); const { data, error } = await client().rpc('review_training_signup_lifecycle', { p_signup_id: signup.id, p_status: status, p_admin_notes: options.adminNotes || signup.adminNotes || null }); if (error) throw error; const saved = trainingSignupFromRow(data, signup); if (saved) upsertLocal(listTrainingSignups, store().saveTrainingSignups, 'volunteer-training-signups-synced', saved); if (saved?.status === 'completed') await notifyTrainingCompletion(saved); await refreshTrainingSignups(); await fetchNotifications(); return { ok: true, signup: saved || signup }; }); }

  async function notifyOpportunityStatusChange(signup, status = signup?.status) { const labels = { confirmed: ['Opportunity confirmed', `You have been confirmed for ${signup?.title || 'your opportunity'}.`], waitlisted: ['Opportunity waitlisted', `You have been waitlisted for ${signup?.title || 'your opportunity'}.`], declined: ['Opportunity not selected', `Your sign-up for ${signup?.title || 'your opportunity'} was not selected.`], completed: ['Opportunity completed', `Your volunteering hours for ${signup?.title || 'your opportunity'} have been verified.`] }; const copy = labels[status]; if (!copy || !signup?.email || !signup?.id) return { ok: false, skipped: true }; return createNotification({ recipientEmail: signup.email, recipientRole: 'volunteer', title: copy[0], message: copy[1], type: `opportunity_${status}`, relatedTable: canonicalTables.opportunitySignups, relatedId: signup.id, groupKey: `opportunity:${signup.id}:${status}` }); }
  async function notifyAttendanceReview(claim) { const labels = { verified: ['Attendance verified', `Your attendance for ${claim?.title || 'your opportunity'} has been verified.`], adjusted: ['Attendance adjusted', `Your attendance hours for ${claim?.title || 'your opportunity'} have been adjusted and verified.`], clarification_requested: ['Attendance clarification needed', `Admin requested clarification for your attendance record: ${claim?.title || 'your opportunity'}.`], rejected: ['Attendance rejected', `Your attendance record for ${claim?.title || 'your opportunity'} was rejected.`] }; const copy = labels[claim?.claimStatus]; if (!copy || !claim?.email || !claim?.id) return { ok: false, skipped: true }; return createNotification({ recipientEmail: claim.email, recipientRole: 'volunteer', title: copy[0], message: copy[1], type: `attendance_${claim.claimStatus}`, relatedTable: canonicalTables.attendanceClaims, relatedId: claim.id, groupKey: `attendance:${claim.id}:${claim.claimStatus}` }); }
  async function notifyTrainingCompletion(signup) { if (!signup?.email || signup.status !== 'completed' || !signup?.id) return { ok: false, skipped: true }; return createNotification({ recipientEmail: signup.email, recipientRole: 'volunteer', title: 'Training completed', message: `Your completion for ${signup.title || 'your training'} has been recorded.`, type: 'training_completed', relatedTable: canonicalTables.trainingSignups, relatedId: signup.id, groupKey: `training:${signup.id}:completed` }); }
  async function notifyReferralAccepted(referral) { const email = referral?.referrer_email || referral?.referrerEmail; if (!email) return { ok: false, skipped: true }; const name = referral.referred_name || referral.referredName || referral.referred_email || referral.referredEmail || 'A referred volunteer'; return createNotification({ recipientEmail: email, recipientRole: 'volunteer', title: 'Referral accepted', message: `${name} accepted your volunteer referral.`, type: 'referral_accepted', relatedTable: 'app_referrals', relatedId: referral.id || referral.referral_id || '', groupKey: `referral:${referral.id || referral.referral_id || email}` }); }
  async function notifyPointsAwarded(entry) { const email = entry?.volunteer_email || entry?.email; if (!email) return { ok: false, skipped: true }; const points = Number(entry.points || 0); return createNotification({ recipientEmail: email, recipientRole: 'volunteer', title: 'Points awarded', message: `${points > 0 ? '+' : ''}${points} volunteer points were added to your profile.`, type: 'points_awarded', relatedTable: canonicalTables.pointsLedger, relatedId: entry.ledger_id || entry.id || '', groupKey: `points:${entry.ledger_id || entry.id || email}`, metadata: { reason: entry.points_reason || entry.reason || '' } }); }
  async function notifyAchievementUnlocked(userEmail, achievement) { if (!userEmail || !achievement?.id) return { ok: false, skipped: true }; return createNotification({ recipientEmail: userEmail, recipientRole: 'volunteer', title: 'Achievement unlocked', message: `You unlocked ${achievement.title || achievement.badge_label || 'a new achievement'}.`, type: 'achievement_unlocked', relatedTable: 'app_user_achievements', relatedId: achievement.id, groupKey: `achievement:${userEmail}:${achievement.id}`, metadata: achievement }); }

  function countByStatus(items, statuses) { const set = new Set(asArray(statuses).map(String)); return asArray(items).filter(item => set.has(String(item.status || item.claimStatus || ''))).length; }
  function adminQueueCounts() { return { pendingSignups: countByStatus(listOpportunitySignups(), ['pending_review', 'waitlisted']), attendanceQueue: countByStatus(listAttendanceClaims(), ['checked_in', 'submitted', 'clarification_requested']), trainingQueue: countByStatus(listTrainingSignups(), ['registered', 'waitlisted']) }; }

  window.MENDAKIDataAccess = Object.freeze({ canonicalTables, deprecatedTables, mappers, snapshot, listOpportunitySignups, listAttendanceClaims, listTrainingSignups, listTrainingSessions, listNotifications, refreshOpportunitySignups, refreshAttendanceClaims, refreshTrainingSignups, refreshTrainingSessions, refreshAdminQueue, fetchAdminTrainingSessions, saveAdminTrainingSession, deleteAdminTrainingSession, fetchNotifications, createNotification, updateNotifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications, refreshAdminTaskNotifications, createOpportunitySignup, cancelOpportunitySignup, createTrainingSignup, cancelTrainingSignup, validateAttendanceCode, recordAttendancePunch, reviewOpportunitySignup, reviewAttendanceClaim, reviewTrainingSignup, notifyOpportunityStatusChange, notifyAttendanceReview, notifyTrainingCompletion, notifyReferralAccepted, notifyPointsAwarded, notifyAchievementUnlocked, adminQueueCounts, countByStatus });
})();
