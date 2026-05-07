const VolunteerDataStore = (() => {
  const keys = Object.freeze({
    session: 'mendaki.volunteer.session.v1',
    profile: 'mendaki.volunteer.profile.v1',
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

  function roleForEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    return normalized.startsWith('admin@') || normalized.includes('+admin@') ? 'admin' : 'volunteer';
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

  async function refreshSupabaseSession() {
    if (!authState.supabase) return getSession();
    const { data, error } = await authState.supabase.auth.getUser();
    if (error || !data?.user) {
      authState.user = null;
      authState.profile = null;
      return getSession();
    }

    authState.user = data.user;
    authState.profile = await fetchAppUser(data.user);
    const session = sessionFromAuthUser(data.user, authState.profile);
    if (session) saveSession(session);
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
    authState.supabase.auth.onAuthStateChange(async () => {
      await refreshSupabaseSession();
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
      if (session) saveSession(session);
    }
    return { ok: true };
  }

  async function signOut() {
    if (authState.supabase) {
      await authState.supabase.auth.signOut();
    }
    authState.user = null;
    authState.profile = null;
    clearSession();
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

  function getProfile() {
    return readJson(keys.profile, null);
  }

  function saveProfile(profile) {
    return writeJson(keys.profile, profile);
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
    const profile = getProfile() || {};
    const session = getSession() || {};
    return profile.email || session.email || '';
  }

  function isSignedIn() {
    return Boolean(currentEmail());
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

VolunteerDataStore.initAuth().then(() => {
  window.dispatchEvent(new CustomEvent('volunteer-auth-ready'));
});
