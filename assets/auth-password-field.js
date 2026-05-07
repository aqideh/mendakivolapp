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

function showProfileSavedToast() {
  document.querySelector('[data-profile-toast]')?.remove();

  const toast = document.createElement('div');
  toast.dataset.profileToast = 'true';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = 'Profile saved';
  Object.assign(toast.style, {
    position: 'fixed',
    right: '1rem',
    bottom: '5.5rem',
    zIndex: '1000',
    padding: '0.8rem 1rem',
    borderRadius: '999px',
    background: '#373A36',
    color: '#fff',
    fontWeight: '700',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.18)',
    opacity: '0',
    transform: 'translateY(8px)',
    transition: 'opacity 180ms ease, transform 180ms ease',
    pointerEvents: 'none'
  });

  document.body.append(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    window.setTimeout(() => toast.remove(), 220);
  }, 1800);
}

function bindProfileSavedFeedback() {
  const form = document.querySelector('[data-profile-form]');
  if (!form || form.dataset.profileFeedbackBound === 'true') return;
  form.dataset.profileFeedbackBound = 'true';
  form.addEventListener('submit', () => {
    window.setTimeout(showProfileSavedToast, 0);
  });
}

function installHeaderAndAuthEnhancements() {
  installAuthPasswordField();
  moveDashboardNavToHeaderActions();
  syncDashboardAuthActions();
  bindProfileSavedFeedback();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installHeaderAndAuthEnhancements);
} else {
  installHeaderAndAuthEnhancements();
}

window.addEventListener('volunteer-auth-ready', () => {
  syncDashboardAuthActions();
  bindProfileSavedFeedback();
});
window.addEventListener('volunteer-auth-changed', () => {
  syncDashboardAuthActions();
  bindProfileSavedFeedback();
});
