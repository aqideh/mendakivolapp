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

function installProfileFormToggle() {
  const card = document.querySelector('[aria-labelledby="profile-form-title"]');
  const form = document.querySelector('[data-profile-form]');
  const title = document.querySelector('#profile-form-title');
  if (!card || !form || !title || card.querySelector('[data-profile-edit-toggle]')) return;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'button dashboard-secondary profile-edit-toggle';
  toggle.dataset.profileEditToggle = 'true';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = 'Edit profile details';
  title.insertAdjacentElement('afterend', toggle);

  form.classList.add('is-collapsed');

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.textContent = expanded ? 'Edit profile details' : 'Hide profile form';
    form.classList.toggle('is-collapsed', expanded);
    form.classList.toggle('is-expanded', !expanded);
  });
}

function installHeaderAndAuthEnhancements() {
  installAuthPasswordField();
  moveDashboardNavToHeaderActions();
  syncDashboardAuthActions();
  bindProfileSavedFeedback();
  installProfileFormToggle();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installHeaderAndAuthEnhancements);
} else {
  installHeaderAndAuthEnhancements();
}

window.addEventListener('volunteer-auth-ready', () => {
  syncDashboardAuthActions();
  bindProfileSavedFeedback();
  installProfileFormToggle();
});
window.addEventListener('volunteer-auth-changed', () => {
  syncDashboardAuthActions();
  bindProfileSavedFeedback();
  installProfileFormToggle();
});
