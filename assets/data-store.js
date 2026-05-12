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

  function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); return value; }
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

VolunteerDataStore.initAuth().then(() => {
  window.dispatchEvent(new CustomEvent('volunteer-auth-ready'));
});
