const VolunteerDataStore = (() => {
  const keys = Object.freeze({
    session: 'mendaki.volunteer.session.v1',
    profile: 'mendaki.volunteer.profile.v1',
    opportunitySignups: 'mendaki.volunteer.signups.v1',
    attendanceClaims: 'mendaki.volunteer.attendance.v1',
    trainingSignups: 'mendaki.volunteer.trainingSignups.v1'
  });

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

  function roleForEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    return normalized.startsWith('admin@') || normalized.includes('+admin@') ? 'admin' : 'volunteer';
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
    return role === 'admin' || role === 'super_admin' || roleForEmail(currentEmail()) === 'admin';
  }

  function normaliseSessionRole() {
    const session = getSession();
    if (!session?.email) return session;
    const nextRole = roleForEmail(session.email);
    if (session.role === nextRole) return session;
    return saveSession({ ...session, role: nextRole });
  }

  return {
    keys,
    readJson,
    writeJson,
    remove,
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
