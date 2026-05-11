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

  function remove(key) {
    localStorage.removeItem(key);
  }

  function readArray(key) {
    const value = readJson(key, []);
    return Array.isArray(value) ? value : [];
  }

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
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  function normaliseEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function profileKeyForEmail(email) {
    const normalized = normaliseEmail(email);
    return normalized ? `${keys.profilePrefix}${encodeURIComponent(normalized)}.v1` : keys.profile;
  }

  function roleForEmail(email) {
    const normalized = normaliseEmail(email);
    return normalized.startsWith('admin@') || normalized.includes('+admin@') ? 'admin' : 'volunteer';
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

    if (error) {
      console.warn('Could not fetch app user profile', error);
      return null;
    }
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
      .insert({
        auth_user_id: authUser.id,
        email,
        full_name: name,
        role: 'volunteer'
      })
      .select('id, auth_user_id, email, full_name, role')
      .single();

    if (error) {
      console.warn('Could not create app user profile', error);
      return null;
    }
    return data || null;
  }

  function sessionFromAuthUser(authUser, appUser = null) {
    if (!authUser) return null;
    const email = authUser.email || appUser?.email || '';
    const name = appUser?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || email;
    const role = appUser?.role || authUser.app_metadata?.role || authUser.user_metadata?.role || 'volunteer';
    return {
      email,
      name,
      role,
      authUserId: authUser.id,
      appUserId: appUser?.id || '',
      signedInAt: new Date().toISOString(),
      provider: 'supabase'
    };
  }

  function saveProfileFromSession(session) {
    if (!session?.email) return null;
    const existing = readJson(profileKeyForEmail(session.email), {}) || {};
    const profile = {
      ...existing,
      email: session.email,
      name: existing.name || session.name || session.email,
      role: session.role || existing.role || 'volunteer',
      authUserId: session.authUserId || existing.authUserId || '',
      appUserId: session.appUserId || existing.appUserId || '',
      updatedAt: existing.updatedAt || new Date().toISOString()
    };
    return writeJson(profileKeyForEmail(session.email), profile);
  }

  async function refreshSupabaseSession() {
    if (!authState.supabase) return getSession();
    const { data, error } = await authState.supabase.auth.getUser();
    if (error || !data?.user) {
      clearAuthState();
      return null;
    }

    authState.user = data.user;
    authState.profile = await fetchAppUser(data.user);
    const session = sessionFromAuthUser(data.user, authState.profile);
    if (session) {
      saveSession(session);
      saveProfileFromSession(session);
    }
    return session;
  }

  async function initAuth() {
    authState.supabase = createSupabaseClient();
    authState.usingSupabase = Boolean(authState.supabase);
    if (!authState.supabase) {
      authState.ready = true;
      return { usingSupabase: false };
    }

    await refreshSupabaseSession();
    authState.supabase.auth.onAuthStateChange(async event => {
      if (event === 'SIGNED_OUT') {
        clearAuthState();
      } else {
        await refreshSupabaseSession();
      }
      window.dispatchEvent(new CustomEvent('volunteer-auth-changed'));
    });
    authState.ready = true;
    return { usingSupabase: true, user: authState.user, profile: authState.profile };
  }

  async function signInWithMagicLink(email, fullName = '') {
    if (!authState.supabase) return { ok: false, reason: 'supabase_not_configured' };
    const config = getSupabaseConfig() || {};
    const { error } = await authState.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: config.authRedirectTo || window.location.href,
        data: { full_name: fullName }
      }
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  }

  async function signInWithPassword(email, password, fullName = '') {
    if (!authState.supabase) return { ok: false, reason: 'supabase_not_configured' };
    const { data, error } = await authState.supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, reason: error.message };

    const user = data?.user;
    if (user) {
      authState.user = user;
      authState.profile = await ensureAppUser(user, fullName);
      const session = sessionFromAuthUser(user, authState.profile);
      if (session) {
        saveSession(session);
        saveProfileFromSession(session);
      }
    }
    return { ok: true };
  }

  async function signOut() {
    if (authState.supabase) {
      await authState.supabase.auth.signOut();
    }
    clearAuthState();
  }

  function getSession() {
    return readJson(keys.session, null);
  }

  function saveSession(session) {
    return writeJson(keys.session, session);
  }

  function clearSession() {
    remove(keys.session);
  }

  function getProfile(email = null) {
    const session = getSession();
    const targetEmail = email || session?.email || '';
    if (targetEmail) return readJson(profileKeyForEmail(targetEmail), null);
    return readJson(keys.profile, null);
  }

  function saveProfile(profile) {
    const session = getSession();
    const email = profile?.email || session?.email || '';
    return writeJson(profileKeyForEmail(email), profile);
  }

  function getOpportunitySignups() {
    return readArray(keys.opportunitySignups);
  }

  function saveOpportunitySignups(signups) {
    return writeJson(keys.opportunitySignups, Array.isArray(signups) ? signups : []);
  }

  function getAttendanceClaims() {
    return readArray(keys.attendanceClaims);
  }

  function saveAttendanceClaims(claims) {
    return writeJson(keys.attendanceClaims, Array.isArray(claims) ? claims : []);
  }

  function getTrainingSignups() {
    return readArray(keys.trainingSignups);
  }

  function saveTrainingSignups(signups) {
    return writeJson(keys.trainingSignups, Array.isArray(signups) ? signups : []);
  }

  function currentEmail() {
    return getSession()?.email || '';
  }

  function isSignedIn() {
    return Boolean(getSession()?.email);
  }

  function isAdmin() {
    const session = getSession() || {};
    const role = String(session.role || '').toLowerCase();
    return role === 'admin' || role === 'super_admin' || (!authState.usingSupabase && roleForEmail(currentEmail()) === 'admin');
  }

  function normaliseSessionRole() {
    const session = getSession();
    if (!session?.email) return session;
    if (authState.usingSupabase) return session;
    const nextRole = roleForEmail(session.email);
    if (session.role === nextRole) return session;
    return saveSession({ ...session, role: nextRole });
  }

  return {
    keys,
    authState,
    readJson,
    writeJson,
    remove,
    initAuth,
    refreshSupabaseSession,
    signInWithMagicLink,
    signInWithPassword,
    signOut,
    getSession,
    saveSession,
    clearSession,
    getProfile,
    saveProfile,
    getOpportunitySignups,
    saveOpportunitySignups,
    getAttendanceClaims,
    saveAttendanceClaims,
    getTrainingSignups,
    saveTrainingSignups,
    roleForEmail,
    currentEmail,
    isSignedIn,
    isAdmin,
    normaliseSessionRole
  };
})();

window.VolunteerDataStore = VolunteerDataStore;

(() => {
  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function session() { return store()?.getSession?.() || null; }
  function ready() { return Boolean(client() && session()?.email); }
  function admin() { return Boolean(store()?.isAdmin?.()); }
  function appData() {
    try { return typeof state !== 'undefined' ? state.data : null; } catch (error) { return null; }
  }
  function notice(message, variant = 'error') {
    if (typeof phaseTwoShowModalNotice === 'function') phaseTwoShowModalNotice(message, variant);
    else window.alert(message);
  }
  function setBusy(button, busy, label = 'Saving...') {
    if (!button) return;
    if (busy) {
      button.dataset.phase18OriginalText = button.textContent || '';
      button.disabled = true;
      button.textContent = label;
    } else {
      button.disabled = false;
      if (button.dataset.phase18OriginalText) button.textContent = button.dataset.phase18OriginalText;
      delete button.dataset.phase18OriginalText;
    }
  }
  function dispatch(name) { window.dispatchEvent(new CustomEvent(name)); }
  function refreshAll() {
    if (typeof renderOpportunities === 'function') renderOpportunities();
    if (typeof phaseOneRenderDashboard === 'function') phaseOneRenderDashboard();
    if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
    if (typeof phaseThreeRender === 'function') phaseThreeRender();
    if (typeof phaseFourRender === 'function') phaseFourRender();
  }
  function upsertLocal(list, item, matcher) {
    const index = list.findIndex(matcher);
    if (index >= 0) list[index] = item;
    else list.push(item);
    return list;
  }
  function defaultSessionIdForOpportunity(opportunityId) {
    return window.MENDAKIOpportunitySessions?.defaultForOpportunity?.(opportunityId)?.id || '';
  }
  function opportunitySignupFromRow(row) {
    return {
      id: row.id,
      opportunityId: String(row.opportunity_id || ''),
      sessionId: row.session_id || '',
      email: row.email || '',
      volunteerName: row.volunteer_name || 'Volunteer',
      title: row.title || '',
      type: row.type || '',
      category: row.category || '',
      time: row.time || '',
      location: row.location || '',
      commitment: row.commitment || '',
      hours: Number(row.hours || 0),
      status: row.status || 'pending_review',
      signedUpAt: row.signed_up_at || '',
      reviewedAt: row.reviewed_at || '',
      reviewedBy: row.reviewed_by_email || '',
      adminNotes: row.admin_notes || '',
      confirmedAt: row.confirmed_at || '',
      waitlistedAt: row.waitlisted_at || '',
      declinedAt: row.declined_at || '',
      cancelledAt: row.cancelled_at || '',
      completedAt: row.completed_at || '',
      verifiedHours: Number(row.verified_hours || 0),
      updatedAt: row.updated_at || ''
    };
  }
  function trainingSignupFromRow(row) {
    return {
      id: row.id,
      trainingId: String(row.training_id || ''),
      appUserId: row.volunteer_user_id || '',
      email: row.email || '',
      volunteerName: row.volunteer_name || 'Volunteer',
      title: row.title || '',
      date: row.session_date || '',
      time: row.time || '',
      location: row.location || '',
      trainer: row.trainer || '',
      status: row.status || 'registered',
      signedUpAt: row.signed_up_at || '',
      completedAt: row.completed_at || '',
      cancelledAt: row.cancelled_at || '',
      reviewedBy: row.reviewed_by_email || '',
      reviewedAt: row.reviewed_at || '',
      adminNotes: row.admin_notes || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }
  function claimFromRow(row) {
    return {
      id: row.id,
      signupId: row.signup_id || '',
      opportunityId: String(row.opportunity_id || ''),
      sessionId: row.session_id || '',
      email: row.email || '',
      volunteerName: row.volunteer_name || 'Volunteer',
      title: row.title || '',
      claimStatus: row.claim_status || 'pending_submission',
      checkInAt: row.check_in_at || '',
      checkInCode: row.check_in_code || '',
      checkOutAt: row.check_out_at || '',
      checkOutCode: row.check_out_code || '',
      claimedStatus: row.claimed_status || '',
      claimedStart: row.claimed_start || '',
      claimedEnd: row.claimed_end || '',
      claimedHours: Number(row.claimed_hours || 0),
      verifiedHours: Number(row.verified_hours || 0),
      submittedAt: row.submitted_at || '',
      reviewedBy: row.reviewed_by_email || '',
      reviewedAt: row.reviewed_at || '',
      adminNotes: row.admin_notes || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }
  async function refreshOpportunitySignups() {
    const supabase = client();
    if (!supabase) return [];
    const { data, error } = await supabase.from('app_opportunity_signups').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(opportunitySignupFromRow) : [];
    store().saveOpportunitySignups(rows);
    dispatch('volunteer-signups-synced');
    return rows;
  }
  async function refreshTrainingSignups() {
    const supabase = client();
    if (!supabase) return [];
    const { data, error } = await supabase.from('app_training_signups').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(trainingSignupFromRow) : [];
    store().saveTrainingSignups(rows);
    dispatch('volunteer-training-signups-synced');
    return rows;
  }
  async function refreshAttendanceClaims() {
    const supabase = client();
    if (!supabase) return [];
    const { data, error } = await supabase.from('app_attendance_claims').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(claimFromRow) : [];
    store().saveAttendanceClaims(rows);
    dispatch('volunteer-attendance-synced');
    return rows;
  }
  function hoursBetween(startValue, endValue) {
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
    return Math.round(((end - start) / 36e5) * 100) / 100;
  }
  async function handleOpportunityCancel(button) {
    const signup = store().getOpportunitySignups().find(item => item.email === store().currentEmail() && String(item.opportunityId) === String(button.dataset.cancelSignup) && ['pending_review', 'registered', 'confirmed', 'waitlisted'].includes(item.status));
    if (!signup) return notice('Could not find this sign-up to cancel.');
    setBusy(button, true, 'Cancelling...');
    const { data, error } = await client().rpc('cancel_opportunity_signup', { p_signup_id: signup.id, p_cancellation_reason: null });
    setBusy(button, false);
    if (error) return notice(`Could not cancel this sign-up: ${error.message}`);
    const saved = opportunitySignupFromRow(data);
    store().saveOpportunitySignups(upsertLocal(store().getOpportunitySignups(), saved, item => item.id === saved.id));
    await refreshOpportunitySignups().catch(() => null);
    refreshAll();
  }
  function trainingDraft(trainingId) {
    const training = (appData()?.trainings || []).find(item => String(item.id) === String(trainingId));
    const current = session();
    if (!current?.email) return null;
    if (!training) return null;
    const existing = store().getTrainingSignups().find(item => item.email === current.email && String(item.trainingId) === String(trainingId));
    const profile = store().getProfile() || {};
    return {
      id: existing?.id || crypto.randomUUID(),
      trainingId: String(training.id),
      email: current.email,
      volunteerName: profile.name || current.name || 'Volunteer',
      title: training.title || '',
      date: training.date || '',
      time: training.time || '',
      location: training.location || '',
      trainer: training.trainer || '',
      status: 'registered',
      signedUpAt: existing?.signedUpAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  async function handleTrainingSignup(button) {
    const draft = trainingDraft(button.dataset.signupTraining);
    if (!draft) {
      if (typeof phaseOneOpenAuth === 'function') phaseOneOpenAuth();
      return;
    }
    setBusy(button, true, 'Signing up...');
    const { data, error } = await client().rpc('create_training_signup_with_capacity', {
      p_signup_id: draft.id,
      p_training_id: draft.trainingId,
      p_volunteer_name: draft.volunteerName
    });
    setBusy(button, false);
    if (error) return notice(`Could not sign up for training: ${error.message}`);
    const saved = trainingSignupFromRow(data);
    store().saveTrainingSignups(upsertLocal(store().getTrainingSignups(), saved, item => item.id === saved.id || (item.email === saved.email && String(item.trainingId) === String(saved.trainingId))));
    await refreshTrainingSignups().catch(() => null);
    refreshAll();
  }
  async function handleTrainingCancel(button) {
    const signup = store().getTrainingSignups().find(item => item.email === store().currentEmail() && String(item.trainingId) === String(button.dataset.cancelTraining) && ['registered', 'waitlisted'].includes(item.status));
    if (!signup) return notice('Could not find this training sign-up to cancel.');
    setBusy(button, true, 'Cancelling...');
    const { data, error } = await client().rpc('cancel_training_signup', { p_signup_id: signup.id, p_cancellation_reason: null });
    setBusy(button, false);
    if (error) return notice(`Could not cancel training sign-up: ${error.message}`);
    const saved = trainingSignupFromRow(data);
    store().saveTrainingSignups(upsertLocal(store().getTrainingSignups(), saved, item => item.id === saved.id));
    await refreshTrainingSignups().catch(() => null);
    refreshAll();
  }
  async function handleTrainingReview(button) {
    if (!admin()) return;
    const signup = store().getTrainingSignups().find(item => item.id === button.dataset.trainingStatus || item.id === button.dataset.completeTraining);
    const status = button.dataset.trainingNextStatus || (button.dataset.completeTraining ? 'completed' : 'registered');
    if (!signup) return;
    setBusy(button, true, 'Saving...');
    const { data, error } = await client().rpc('review_training_signup_lifecycle', { p_signup_id: signup.id, p_status: status, p_admin_notes: signup.adminNotes || null });
    setBusy(button, false);
    if (error) return window.alert(`Could not update training status: ${error.message}`);
    const saved = trainingSignupFromRow(data);
    store().saveTrainingSignups(upsertLocal(store().getTrainingSignups(), saved, item => item.id === saved.id));
    await refreshTrainingSignups().catch(() => null);
    if (typeof store().fetchNotifications === 'function') await store().fetchNotifications().catch(() => null);
    refreshAll();
  }
  async function validateAttendanceCode(opportunityId, code) {
    if (typeof store().validateAttendanceCode === 'function') return store().validateAttendanceCode(opportunityId, code);
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
    const resolvedSessionId = signup.sessionId || existing?.sessionId || defaultSessionIdForOpportunity(signup.opportunityId) || null;
    const row = {
      id: existing?.id || crypto.randomUUID(),
      signup_id: signup.id,
      opportunity_id: String(signup.opportunityId || ''),
      session_id: resolvedSessionId,
      email: signup.email || session()?.email || '',
      volunteer_name: signup.volunteerName || session()?.name || 'Volunteer',
      title: signup.title || '',
      claim_status: action === 'checkout' ? 'submitted' : 'checked_in',
      check_in_at: existing?.checkInAt || now,
      check_in_code: action === 'checkout' ? existing?.checkInCode || null : normalized,
      check_out_at: action === 'checkout' ? now : null,
      check_out_code: action === 'checkout' ? normalized : null,
      claimed_status: action === 'checkout' ? 'attended' : 'checked_in',
      claimed_start: existing?.checkInAt || now,
      claimed_end: action === 'checkout' ? now : null,
      claimed_hours: action === 'checkout' ? hoursBetween(existing?.checkInAt, now) : 0,
      verified_hours: 0,
      submitted_at: action === 'checkout' ? now : null,
      reviewed_by_email: null,
      reviewed_at: null,
      admin_notes: null,
      created_at: existing?.createdAt || now,
      updated_at: now
    };
    if (action === 'checkout' && !existing?.checkInAt) return window.alert('No check-in timestamp found. Please check in first.');
    setBusy(button, true, action === 'checkout' ? 'Checking out...' : 'Checking in...');
    const { data, error } = await client().from('app_attendance_claims').upsert(row, { onConflict: 'id' }).select('*').single();
    setBusy(button, false);
    if (error) return window.alert(`Could not save attendance: ${error.message}`);
    const saved = claimFromRow(data);
    store().saveAttendanceClaims(upsertLocal(store().getAttendanceClaims(), saved, item => item.id === saved.id));
    await refreshAttendanceClaims().catch(() => null);
    refreshAll();
  }
  async function handleAttendanceReview(form, submitter) {
    if (!admin()) return;
    const claim = store().getAttendanceClaims().find(item => item.id === form.dataset.attendanceReview);
    if (!claim) return;
    const formData = new FormData(form);
    const enteredHours = Number(formData.get('verifiedHours') || claim.claimedHours || 0);
    const systemHours = Number(form.querySelector('input[name="verifiedHours"]')?.dataset.systemHours || claim.claimedHours || 0);
    const action = submitter?.value || (enteredHours !== systemHours ? 'adjust' : 'verify');
    setBusy(submitter, true, 'Saving...');
    const { error } = await client().rpc('review_attendance_claim_transactional', {
      p_claim_id: claim.id,
      p_action: action,
      p_verified_hours: enteredHours,
      p_admin_notes: String(formData.get('adminNotes') || '').trim() || null
    });
    setBusy(submitter, false);
    if (error) return window.alert(`Could not review attendance: ${error.message}`);
    await refreshAttendanceClaims().catch(() => null);
    await refreshOpportunitySignups().catch(() => null);
    if (typeof store().fetchNotifications === 'function') await store().fetchNotifications().catch(() => null);
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
    event.preventDefault();
    event.stopImmediatePropagation();
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
    event.preventDefault();
    event.stopImmediatePropagation();
    handleAttendanceReview(form, event.submitter);
  }, true);
})();

VolunteerDataStore.initAuth().then(() => {
  window.dispatchEvent(new CustomEvent('volunteer-auth-ready'));
});
