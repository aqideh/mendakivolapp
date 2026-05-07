function adminSessionReadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch (error) {
    console.warn(`Could not parse ${key}`, error);
    return null;
  }
}

function adminSessionWriteJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function adminSessionEmail() {
  const profile = adminSessionReadJson('mendaki.volunteer.profile.v1') || {};
  const session = adminSessionReadJson('mendaki.volunteer.session.v1') || {};
  return String(profile.email || session.email || '').trim().toLowerCase();
}

function adminSessionRoleForEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  return value.startsWith('admin@') || value.includes('+admin@') ? 'admin' : 'volunteer';
}

function adminSessionIsAdmin() {
  const session = adminSessionReadJson('mendaki.volunteer.session.v1') || {};
  const role = String(session.role || '').toLowerCase();
  const email = adminSessionEmail();
  return role === 'admin' || role === 'super_admin' || adminSessionRoleForEmail(email) === 'admin';
}

function adminSessionNormaliseRole() {
  const session = adminSessionReadJson('mendaki.volunteer.session.v1');
  if (!session?.email) return;
  const nextRole = adminSessionRoleForEmail(session.email);
  if (session.role !== nextRole) {
    adminSessionWriteJson('mendaki.volunteer.session.v1', {
      ...session,
      role: nextRole
    });
  }
}

function adminSessionRefreshDashboard() {
  adminSessionNormaliseRole();

  if (typeof phaseOneRenderDashboard === 'function') phaseOneRenderDashboard();
  if (typeof phaseThreeRender === 'function') phaseThreeRender();
  if (typeof phaseFourRender === 'function') phaseFourRender();

  document.querySelectorAll('[data-signup-dashboard-card="admin"], [data-attendance-card="admin"], [data-training-dashboard-card="admin"]').forEach(card => {
    card.hidden = !adminSessionIsAdmin();
  });
}

function adminSessionInstallOverrides() {
  if (typeof phaseTwoIsAdmin === 'function') {
    phaseTwoIsAdmin = adminSessionIsAdmin;
  }
  if (typeof phaseThreeIsAdmin === 'function') {
    phaseThreeIsAdmin = adminSessionIsAdmin;
  }
  if (typeof phaseFourIsAdmin === 'function') {
    phaseFourIsAdmin = adminSessionIsAdmin;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  adminSessionInstallOverrides();
  adminSessionRefreshDashboard();
});

document.addEventListener('submit', event => {
  if (event.target.closest('[data-auth-form], [data-profile-form]')) {
    window.setTimeout(() => {
      adminSessionInstallOverrides();
      adminSessionRefreshDashboard();
    }, 0);
  }
}, true);

document.addEventListener('click', event => {
  if (event.target.closest('[data-auth-sign-out]')) {
    window.setTimeout(adminSessionRefreshDashboard, 0);
  }
}, true);

window.addEventListener('storage', adminSessionRefreshDashboard);
