function installAuthPasswordField() {
  const form = document.querySelector('[data-auth-form]');
  if (!form || form.querySelector('[data-auth-password-field]')) return;

  const submit = form.querySelector('button[type="submit"]');
  const label = document.createElement('label');
  label.dataset.authPasswordField = 'true';
  label.hidden = true;
  label.append(document.createTextNode('Password'));

  const input = document.createElement('input');
  input.name = 'password';
  input.type = 'password';
  input.autocomplete = 'current-password';
  input.placeholder = 'Password';

  label.append(input);
  form.insertBefore(label, submit);
}

function moveDashboardNavToHeaderActions() {
  const headerActions = document.querySelector('.header-actions');
  const dashboardButton = document.querySelector('.desktop-nav [data-dashboard-nav]');
  const signInButton = document.querySelector('.header-actions [data-auth-entry]');
  if (!headerActions || !dashboardButton || dashboardButton.dataset.headerDashboard === 'true') return;

  dashboardButton.dataset.headerDashboard = 'true';
  dashboardButton.classList.remove('nav-link');
  dashboardButton.classList.add('admin-link', 'dashboard-header-link');
  dashboardButton.textContent = 'Dashboard';
  dashboardButton.removeAttribute('aria-current');
  headerActions.insertBefore(dashboardButton, signInButton || headerActions.firstChild);
}

function syncDashboardAuthActions() {
  const signedIn = Boolean(window.VolunteerDataStore?.getSession?.()?.email);
  document.querySelectorAll('.dashboard-profile-card [data-auth-entry]').forEach(button => {
    button.hidden = signedIn;
  });
}

function installHeaderAndAuthEnhancements() {
  installAuthPasswordField();
  moveDashboardNavToHeaderActions();
  syncDashboardAuthActions();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installHeaderAndAuthEnhancements);
} else {
  installHeaderAndAuthEnhancements();
}

window.addEventListener('volunteer-auth-ready', syncDashboardAuthActions);
window.addEventListener('volunteer-auth-changed', syncDashboardAuthActions);
