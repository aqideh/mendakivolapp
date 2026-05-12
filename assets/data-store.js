const VolunteerDataStore = (() => {
  const keys = Object.freeze({
    session: 'mendaki.volunteer.session.v1',
    profile: 'mendaki.volunteer.profile.v1',
    profilePrefix: 'mendaki.volunteer.profile.',
    opportunitySignups: 'mendaki.volunteer.signups.v1',
    attendanceClaims: 'mendaki.volunteer.attendance.v1',
    trainingSignups: 'mendaki.volunteer.trainingSignups.v1'
  });

  const authState = {
    supabase: null,
    ready: false,
    usingSupabase: false,
    user: null,
    profile: null
  };

  function readJson(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      console.warn(`Could not parse ${key}`, error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function remove(key) { localStorage.removeItem(key); }
  function readArray(key) { const value = readJson(key, []); return Array.isArray(value) ? value : []; }
  function normaliseEmail(email) { return String(email || '').trim().toLowerCase(); }
  function profileKeyForEmail(email) {
    const normalized = normaliseEmail(email);
    return normalized ? `${keys.profilePrefix}${encodeURIComponent(normalized)}.v1` : keys.profile;
  }
  function roleForEmail() { return 'volunteer'; }

  function getSupabaseConfig() {
    const config = window.MENDAKI_SUPABASE_CONFIG || null;
    if (!config?.url || !config?.anonKey) return null;
    if (String(config.url).includes('YOUR_PROJECT_REF') || String(config.anonKey).includes('YOUR_SUPABASE_ANON_KEY')) return null;
    return config;
  }

  function createSupabaseClient() {
    const config = getSupabaseConfig();
    if (!config || !window.supabase?.createClient) return null;
    return window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  function getSession() { return readJson(keys.session, null); }
  function saveSession(session) { return writeJson(keys.session, session); }
  function clearSession() { remove(keys.session); }
  function currentEmail() { return getSession()?.email || ''; }
  function isSignedIn() { return Boolean(getSession()?.email); }
  function isAdmin() {
    const role = String(getSession()?.role || '').toLowerCase();
    return authState.usingSupabase && (role === 'admin' || role === 'super_admin');
  }

  function normaliseSessionRole() {
    const session = getSession();
    if (!session?.email || authState.usingSupabase || session.role === 'volunteer') return session;
    return saveSession({ ...session, role: 'volunteer' });
  }

  function clearAuthState() {
    authState.user = null;
    authState.profile = null;
    clearSession();
  }

  async function fetchAppUser(authUser) {
    if (!authState.supabase || !authUser?.id) return null;
    const { data, error } = await authState.supabase
      .from('app_users')
      .select('id, auth_user_id, email, full_name, role')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function ensureAppUser(authUser, fullName = '') {
    if (!authState.supabase || !authUser?.id) return null;
    const existing = await fetchAppUser(authUser);
    if (existing) return existing;
    const email = authUser.email || '';
    const name = fullName || authUser.user_metadata?.full_name || authUser.user_metadata?.name || email;
    const { data, error } = await authState.supabase
      .from('app_users')
      .insert({ auth_user_id: authUser.id, email, full_name: name, role: 'volunteer' })
      .select('id, auth_user_id, email, full_name, role')
      .single();
    if (error) throw error;
    return data || null;
  }

  function sessionFromAuthUser(authUser, appUser = null) {
    if (!authUser) return null;
    const email = authUser.email || appUser?.email || '';
    const name = appUser?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || email;
    const role = appUser?.role || authUser.app_metadata?.role || authUser.user_metadata?.role || 'volunteer';
    return { email, name, role, authUserId: authUser.id, appUserId: appUser?.id || '', signedInAt: new Date().toISOString(), provider: 'supabase' };
  }

  function saveProfileFromSession(session) {
    if (!session?.email) return null;
    const existing = readJson(profileKeyForEmail(session.email), {}) || {};
    return writeJson(profileKeyForEmail(session.email), {
      ...existing,
      email: session.email,
      name: existing.name || session.name || session.email,
      role: session.role || existing.role || 'volunteer',
      authUserId: session.authUserId || existing.authUserId || '',
      appUserId: session.appUserId || existing.appUserId || '',
      updatedAt: existing.updatedAt || new Date().toISOString()
    });
  }

  async function refreshSupabaseSession() {
    if (!authState.supabase) return getSession();
    const { data, error } = await authState.supabase.auth.getUser();
    if (error || !data?.user) { clearAuthState(); return null; }
    authState.user = data.user;
    authState.profile = await ensureAppUser(data.user);
    const session = sessionFromAuthUser(data.user, authState.profile);
    if (session) { saveSession(session); saveProfileFromSession(session); }
    return session;
  }

  async function initAuth() {
    authState.supabase = createSupabaseClient();
    authState.usingSupabase = Boolean(authState.supabase);
    if (!authState.supabase) { normaliseSessionRole(); authState.ready = true; return { usingSupabase: false }; }
    await refreshSupabaseSession();
    authState.supabase.auth.onAuthStateChange(async event => {
      if (event === 'SIGNED_OUT') clearAuthState();
      else await refreshSupabaseSession();
      window.dispatchEvent(new CustomEvent('volunteer-auth-changed'));
    });
    authState.ready = true;
    return { usingSupabase: true, user: authState.user, profile: authState.profile };
  }

  async function signInWithMagicLink(email, fullName = '') {
    if (!authState.supabase) return { ok: false, reason: 'supabase_not_configured' };
    const config = getSupabaseConfig() || {};
    const { error } = await authState.supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: config.authRedirectTo || window.location.href, data: { full_name: fullName } } });
    return error ? { ok: false, reason: error.message } : { ok: true };
  }

  async function signInWithPassword(email, password, fullName = '') {
    if (!authState.supabase) return { ok: false, reason: 'supabase_not_configured' };
    const { data, error } = await authState.supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, reason: error.message };
    if (data?.user) {
      authState.user = data.user;
      authState.profile = await ensureAppUser(data.user, fullName);
      const session = sessionFromAuthUser(data.user, authState.profile);
      if (session) { saveSession(session); saveProfileFromSession(session); }
    }
    return { ok: true };
  }

  async function signOut() {
    if (authState.supabase) await authState.supabase.auth.signOut();
    clearAuthState();
  }

  function getProfile(email = null) {
    const targetEmail = email || getSession()?.email || '';
    return targetEmail ? readJson(profileKeyForEmail(targetEmail), null) : readJson(keys.profile, null);
  }
  function saveProfile(profile) { return writeJson(profileKeyForEmail(profile?.email || getSession()?.email || ''), profile); }
  function getOpportunitySignups() { return readArray(keys.opportunitySignups); }
  function saveOpportunitySignups(signups) { return writeJson(keys.opportunitySignups, Array.isArray(signups) ? signups : []); }
  function getAttendanceClaims() { return readArray(keys.attendanceClaims); }
  function saveAttendanceClaims(claims) { return writeJson(keys.attendanceClaims, Array.isArray(claims) ? claims : []); }
  function getTrainingSignups() { return readArray(keys.trainingSignups); }
  function saveTrainingSignups(signups) { return writeJson(keys.trainingSignups, Array.isArray(signups) ? signups : []); }

  function mappers() { return window.MENDAKIDataAccess.mappers; }
  function client() { return authState.supabase; }
  function dispatch(name) { window.dispatchEvent(new CustomEvent(name)); }

  async function fetchSupabaseOpportunitySignups() {
    const { data, error } = await client().from('app_opportunity_signups').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(row => mappers().opportunitySignupFromRow(row)) : [];
    saveOpportunitySignups(rows);
    dispatch('volunteer-signups-synced');
    return rows;
  }

  async function fetchSupabaseTrainingSignups() {
    const { data, error } = await client().from('app_training_signups').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(row => mappers().trainingSignupFromRow(row)) : [];
    saveTrainingSignups(rows);
    dispatch('volunteer-training-signups-synced');
    return rows;
  }

  async function fetchSupabaseAttendanceClaims() {
    const { data, error } = await client().from('app_attendance_claims').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(row => mappers().attendanceClaimFromRow(row)) : [];
    saveAttendanceClaims(rows);
    dispatch('volunteer-attendance-synced');
    return rows;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }
  function getStatusLabel(status, context = '') {
    const value = String(status || '').toLowerCase();
    const labels = { pending_review: 'Pending review', registered: context === 'training' ? 'Registered' : 'Pending review', confirmed: 'Confirmed', waitlisted: 'Waitlisted', declined: 'Declined', cancelled: 'Cancelled', completed: 'Completed', checked_in: 'Checked in', submitted: 'Submitted', pending_submission: 'Pending submission', verified: 'Verified', adjusted: 'Adjusted', rejected: 'Rejected', clarification_requested: 'Clarification requested', no_show: 'No-show' };
    return labels[value] || status || 'Unknown';
  }
  function getStatusBadgeClass(status, context = '') {
    const value = String(status || '').toLowerCase();
    if (['confirmed', 'verified'].includes(value)) return 'badge-open';
    if (['completed'].includes(value)) return 'badge-long-term';
    if (['waitlisted', 'declined', 'cancelled', 'rejected', 'no_show'].includes(value)) return 'badge-ad-hoc';
    if (['pending_review', 'registered', 'checked_in', 'submitted', 'pending_submission', 'adjusted', 'clarification_requested'].includes(value)) return 'badge-pending';
    return context === 'training' ? 'badge-long-term' : 'badge-ad-hoc';
  }

  const utils = Object.freeze({ escapeHtml });
  const statusLabels = Object.freeze({ getStatusLabel });
  const statusBadges = Object.freeze({ getStatusBadgeClass });
  const $ = Object.freeze({ session: getSession, email: currentEmail, isAdmin, isSignedIn });

  return {
    keys, authState, utils, statusLabels, statusBadges, $,
    readJson, writeJson, remove,
    initAuth, refreshSupabaseSession, signInWithMagicLink, signInWithPassword, signOut,
    getSession, saveSession, clearSession, getProfile, saveProfile,
    getOpportunitySignups, saveOpportunitySignups, getAttendanceClaims, saveAttendanceClaims, getTrainingSignups, saveTrainingSignups,
    fetchSupabaseOpportunitySignups, fetchSupabaseAttendanceClaims, fetchSupabaseTrainingSignups,
    roleForEmail, currentEmail, isSignedIn, isAdmin, normaliseSessionRole
  };
})();

window.VolunteerDataStore = VolunteerDataStore;

(() => {
  function store() { return window.VolunteerDataStore; }
  function dataAccess() { return window.MENDAKIDataAccess; }
  function client() { return store().authState.supabase; }
  function session() { return store().getSession(); }
  function ready() { return Boolean(client() && session()?.email); }
  function admin() { return Boolean(store().isAdmin()); }
  function appData() { return state.data; }
  function notice(message) { if (typeof phaseTwoShowModalNotice === 'function') phaseTwoShowModalNotice(message, 'error'); else window.alert(message); }
  function setBusy(button, busy, label = 'Saving...') {
    if (!button) return;
    if (busy) { button.dataset.phase18OriginalText = button.textContent || ''; button.disabled = true; button.textContent = label; }
    else { button.disabled = false; if (button.dataset.phase18OriginalText) button.textContent = button.dataset.phase18OriginalText; delete button.dataset.phase18OriginalText; }
  }
  function refreshAll() {
    if (typeof renderOpportunities === 'function') renderOpportunities();
    if (typeof phaseOneRenderDashboard === 'function') phaseOneRenderDashboard();
    if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
    if (typeof phaseThreeRender === 'function') phaseThreeRender();
    if (typeof phaseFourRender === 'function') phaseFourRender();
  }
  function upsertLocal(list, item, matcher) { const index = list.findIndex(matcher); if (index >= 0) list[index] = item; else list.push(item); return list; }
  function defaultSessionIdForOpportunity(opportunityId) { return window.MENDAKIOpportunitySessions.defaultForOpportunity(opportunityId).id; }
  function hoursBetween(startValue, endValue) {
    const start = new Date(startValue); const end = new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
    return Math.round(((end - start) / 36e5) * 100) / 100;
  }
  function trainingDraft(trainingId) {
    const training = appData().trainings.find(item => String(item.id) === String(trainingId));
    const current = session();
    if (!current?.email || !training) return null;
    const existing = store().getTrainingSignups().find(item => item.email === current.email && String(item.trainingId) === String(trainingId));
    const profile = store().getProfile() || {};
    return { id: existing?.id || crypto.randomUUID(), trainingId: String(training.id), email: current.email, volunteerName: profile.name || current.name || 'Volunteer', title: training.title || '', date: training.date || '', time: training.time || '', location: training.location || '', trainer: training.trainer || '', status: 'registered', signedUpAt: existing?.signedUpAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  async function handleOpportunityCancel(button) {
    const signup = store().getOpportunitySignups().find(item => item.email === store().currentEmail() && String(item.opportunityId) === String(button.dataset.cancelSignup) && ['pending_review', 'registered', 'confirmed', 'waitlisted'].includes(item.status));
    if (!signup) return notice('Could not find this sign-up to cancel.');
    setBusy(button, true, 'Cancelling...');
    const { data, error } = await client().rpc('cancel_opportunity_signup', { p_signup_id: signup.id, p_cancellation_reason: null });
    setBusy(button, false);
    if (error) return notice(`Could not cancel this sign-up: ${error.message}`);
    const saved = dataAccess().mappers.opportunitySignupFromRow(data, signup);
    store().saveOpportunitySignups(upsertLocal(store().getOpportunitySignups(), saved, item => item.id === saved.id));
    await store().fetchSupabaseOpportunitySignups();
    refreshAll();
  }
  async function handleTrainingSignup(button) {
    const draft = trainingDraft(button.dataset.signupTraining);
    if (!draft) return phaseOneOpenAuth();
    setBusy(button, true, 'Signing up...');
    const { data, error } = await client().rpc('create_training_signup_with_capacity', { p_signup_id: draft.id, p_training_id: draft.trainingId, p_volunteer_name: draft.volunteerName });
    setBusy(button, false);
    if (error) return notice(`Could not sign up for training: ${error.message}`);
    const saved = dataAccess().mappers.trainingSignupFromRow(data, draft);
    store().saveTrainingSignups(upsertLocal(store().getTrainingSignups(), saved, item => item.id === saved.id || (item.email === saved.email && String(item.trainingId) === String(saved.trainingId))));
    await store().fetchSupabaseTrainingSignups();
    refreshAll();
  }
  async function handleTrainingCancel(button) {
    const signup = store().getTrainingSignups().find(item => item.email === store().currentEmail() && String(item.trainingId) === String(button.dataset.cancelTraining) && ['registered', 'waitlisted'].includes(item.status));
    if (!signup) return notice('Could not find this training sign-up to cancel.');
    setBusy(button, true, 'Cancelling...');
    const { data, error } = await client().rpc('cancel_training_signup', { p_signup_id: signup.id, p_cancellation_reason: null });
    setBusy(button, false);
    if (error) return notice(`Could not cancel training sign-up: ${error.message}`);
    const saved = dataAccess().mappers.trainingSignupFromRow(data, signup);
    store().saveTrainingSignups(upsertLocal(store().getTrainingSignups(), saved, item => item.id === saved.id));
    await store().fetchSupabaseTrainingSignups();
    refreshAll();
  }
  async function handleTrainingReview(button) {
    if (!admin()) return;
    const signupId = button.dataset.trainingStatus || button.dataset.completeTraining;
    const status = button.dataset.trainingNextStatus || (button.dataset.completeTraining ? 'completed' : 'registered');
    if (!signupId) return;
    setBusy(button, true, 'Saving...');
    const result = await dataAccess().reviewTrainingSignup(signupId, status, {});
    setBusy(button, false);
    if (!result.ok) return window.alert(`Could not update training status: ${result.reason || 'Unknown error'}`);
    refreshAll();
  }
  async function validateAttendanceCode(opportunityId, code) {
    const { data, error } = await client().rpc('validate_attendance_code', { p_opportunity_id: String(opportunityId), p_code: String(code) });
    if (error) return { ok: false, reason: error.message };
    return data === true ? { ok: true } : { ok: false, reason: 'Invalid facilitator code.' };
  }
  async function handleAttendancePunch(button) {
    const signup = store().getOpportunitySignups().find(item => item.id === button.dataset.attendancePunch);
    if (!signup) return;
    const action = button.dataset.attendanceAction || 'checkin';
    const code = window.prompt(`Enter the 4-digit facilitator code to ${action === 'checkout' ? 'check out' : 'check in'}.`);
    if (code === null) return;
    const normalized = code.trim();
    if (!/^\d{4}$/.test(normalized)) return window.alert('Please enter a valid 4-digit code.');
    const validation = await validateAttendanceCode(signup.opportunityId, normalized);
    if (!validation.ok) return window.alert(validation.reason || 'Invalid facilitator code.');
    const now = new Date().toISOString();
    const existing = store().getAttendanceClaims().find(item => item.signupId === signup.id);
    const resolvedSessionId = signup.sessionId || existing?.sessionId || defaultSessionIdForOpportunity(signup.opportunityId);
    const row = { id: existing?.id || crypto.randomUUID(), signup_id: signup.id, opportunity_id: String(signup.opportunityId || ''), session_id: resolvedSessionId, email: signup.email || session().email || '', volunteer_name: signup.volunteerName || session().name || 'Volunteer', title: signup.title || '', claim_status: action === 'checkout' ? 'submitted' : 'checked_in', check_in_at: existing?.checkInAt || now, check_in_code: action === 'checkout' ? existing?.checkInCode || null : normalized, check_out_at: action === 'checkout' ? now : null, check_out_code: action === 'checkout' ? normalized : null, claimed_status: action === 'checkout' ? 'attended' : 'checked_in', claimed_start: existing?.checkInAt || now, claimed_end: action === 'checkout' ? now : null, claimed_hours: action === 'checkout' ? hoursBetween(existing?.checkInAt, now) : 0, verified_hours: 0, submitted_at: action === 'checkout' ? now : null, reviewed_by_email: null, reviewed_at: null, admin_notes: null, created_at: existing?.createdAt || now, updated_at: now };
    if (action === 'checkout' && !existing?.checkInAt) return window.alert('No check-in timestamp found. Please check in first.');
    setBusy(button, true, action === 'checkout' ? 'Checking out...' : 'Checking in...');
    const { data, error } = await client().from('app_attendance_claims').upsert(row, { onConflict: 'id' }).select('*').single();
    setBusy(button, false);
    if (error) return window.alert(`Could not save attendance: ${error.message}`);
    const saved = dataAccess().mappers.attendanceClaimFromRow(data, existing);
    store().saveAttendanceClaims(upsertLocal(store().getAttendanceClaims(), saved, item => item.id === saved.id));
    await store().fetchSupabaseAttendanceClaims();
    refreshAll();
  }
  async function handleAttendanceReview(form, submitter) {
    if (!admin()) return;
    const claimId = form.dataset.attendanceReview;
    const claim = store().getAttendanceClaims().find(item => item.id === claimId);
    if (!claim || !claimId) return;
    const formData = new FormData(form);
    const enteredHours = Number(formData.get('verifiedHours') || claim.claimedHours || 0);
    const systemHours = Number(form.querySelector('input[name="verifiedHours"]').dataset.systemHours || claim.claimedHours || 0);
    const status = submitter.value === 'reject' ? 'rejected' : submitter.value === 'clarify' ? 'clarification_requested' : enteredHours !== systemHours ? 'adjusted' : 'verified';
    setBusy(submitter, true, 'Saving...');
    const result = await dataAccess().reviewAttendanceClaim(claimId, status, { verifiedHours: enteredHours, adminNotes: String(formData.get('adminNotes') || '').trim() || null });
    setBusy(submitter, false);
    if (!result.ok) return window.alert(`Could not review attendance: ${result.reason || 'Unknown error'}`);
    refreshAll();
  }
  document.addEventListener('click', event => {
    if (!ready()) return;
    const opportunityCancel = event.target.closest('[data-cancel-signup]');
    const trainingSignup = event.target.closest('[data-signup-training]');
    const trainingCancel = event.target.closest('[data-cancel-training]');
    const trainingReview = event.target.closest('[data-training-status], [data-complete-training]');
    const attendancePunch = event.target.closest('[data-attendance-punch]');
    const target = opportunityCancel || trainingSignup || trainingCancel || trainingReview || attendancePunch;
    if (!target) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (opportunityCancel) handleOpportunityCancel(opportunityCancel);
    else if (trainingSignup) handleTrainingSignup(trainingSignup);
    else if (trainingCancel) handleTrainingCancel(trainingCancel);
    else if (trainingReview) handleTrainingReview(trainingReview);
    else if (attendancePunch) handleAttendancePunch(attendancePunch);
  }, true);
  document.addEventListener('submit', event => {
    if (!ready()) return;
    const form = event.target.closest('[data-attendance-review]');
    if (!form) return;
    event.preventDefault(); event.stopImmediatePropagation();
    handleAttendanceReview(form, event.submitter);
  }, true);
})();

VolunteerDataStore.initAuth().then(() => {
  window.dispatchEvent(new CustomEvent('volunteer-auth-ready'));
});
