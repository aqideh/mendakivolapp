(() => {
  if (window.__authRoleHardeningInstalled) return;
  window.__authRoleHardeningInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function normaliseEmail(email) { return String(email || '').trim().toLowerCase(); }
  function configuredLocalAdminEmails() {
    const config = window.MENDAKI_SUPABASE_CONFIG || {};
    return Array.isArray(config.localAdminEmails) ? config.localAdminEmails.map(normaliseEmail).filter(Boolean) : [];
  }
  function secureRoleForEmail(email) {
    return configuredLocalAdminEmails().includes(normaliseEmail(email)) ? 'admin' : 'volunteer';
  }
  function secureIsAdmin() {
    const dataStore = store();
    const session = dataStore?.getSession?.() || {};
    const role = String(session.role || '').toLowerCase();
    if (role === 'admin' || role === 'super_admin') return true;
    if (dataStore?.authState?.usingSupabase) return false;
    return secureRoleForEmail(session.email || dataStore?.currentEmail?.()) === 'admin';
  }
  function secureNormaliseSessionRole() {
    const dataStore = store();
    const session = dataStore?.getSession?.();
    if (!session?.email) return session;
    if (dataStore?.authState?.usingSupabase) return session;
    const nextRole = secureRoleForEmail(session.email);
    if (session.role === nextRole) return session;
    return dataStore.saveSession({ ...session, role: nextRole });
  }

  function install() {
    const dataStore = store();
    if (!dataStore) return false;
    dataStore.roleForEmail = secureRoleForEmail;
    dataStore.isAdmin = secureIsAdmin;
    dataStore.normaliseSessionRole = secureNormaliseSessionRole;
    return true;
  }

  if (!install()) {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  }
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', install);
})();
