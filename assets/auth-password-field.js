function installAuthPasswordField() {
  const form = document.querySelector('[data-auth-form]');
  if (!form || form.querySelector('[data-auth-password-field]')) return;

  const submit = form.querySelector('button[type="submit"]');

  const nameLabel = document.createElement('label');
  nameLabel.dataset.authNameField = 'true';
  nameLabel.hidden = true;
  nameLabel.append(document.createTextNode('Full name'));

  const nameInput = document.createElement('input');
  nameInput.name = 'name';
  nameInput.type = 'text';
  nameInput.autocomplete = 'name';
  nameInput.placeholder = 'Your name';

  nameLabel.append(nameInput);
  form.insertBefore(nameLabel, submit);

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

function installAuthModeControls() {
  const modal = document.querySelector('.auth-modal');
  const form = document.querySelector('[data-auth-form]');
  const copy = document.querySelector('[data-auth-copy]');
  if (!modal || !form || form.dataset.authModeControls === 'true') return;
  form.dataset.authModeControls = 'true';

  const switcher = document.createElement('div');
  switcher.className = 'auth-mode-switcher';
  switcher.dataset.authModeSwitcher = 'true';
  switcher.setAttribute('role', 'tablist');
  switcher.setAttribute('aria-label', 'Account access mode');
  switcher.innerHTML = `
    <button type="button" class="text-button" data-auth-mode="signin">Sign in</button>
    <button type="button" class="text-button" data-auth-mode="signup">Create account</button>
    <button type="button" class="text-button" data-auth-mode="reset">Reset password</button>
  `;

  const status = document.createElement('p');
  status.className = 'dashboard-muted auth-status-message';
  status.dataset.authStatus = 'true';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  Object.assign(switcher.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    margin: '0.75rem 0 1rem'
  });
  Object.assign(status.style, {
    marginTop: '0.75rem',
    minHeight: '1.25rem'
  });

  if (copy) copy.insertAdjacentElement('afterend', switcher);
  form.insertAdjacentElement('afterend', status);

  switcher.addEventListener('click', event => {
    const button = event.target.closest('[data-auth-mode]');
    if (!button) return;
    setAuthMode(button.dataset.authMode || 'signin');
  });

  setAuthMode('signin');
}

function authUsesSupabase() {
  return Boolean(window.VolunteerDataStore?.authState?.usingSupabase);
}

function authClient() {
  return window.VolunteerDataStore?.authState?.supabase || null;
}

function authRedirectUrl() {
  return window.MENDAKI_SUPABASE_CONFIG?.authRedirectTo || window.location.href.split('#')[0];
}

function setAuthStatus(message, variant = 'neutral') {
  const status = document.querySelector('[data-auth-status]');
  if (!status) return;
  status.textContent = message || '';
  status.dataset.variant = variant;
  status.style.color = variant === 'error' ? '#9b1c1c' : variant === 'success' ? '#1f7a3f' : '';
}

function setAuthMode(mode) {
  const form = document.querySelector('[data-auth-form]');
  const title = document.querySelector('#auth-title');
  const copy = document.querySelector('[data-auth-copy]');
  const submit = form?.querySelector('button[type="submit"]');
  const emailInput = form?.querySelector('input[name="email"]');
  const emailField = emailInput?.closest('label');
  const nameField = form?.querySelector('[data-auth-name-field]');
  const nameInput = form?.querySelector('input[name="name"]');
  const passwordField = form?.querySelector('[data-auth-password-field]');
  const passwordInput = form?.querySelector('input[name="password"]');
  if (!form) return;

  const nextMode = ['signin', 'signup', 'reset', 'update'].includes(mode) ? mode : 'signin';
  form.dataset.authMode = nextMode;
  document.querySelectorAll('[data-auth-mode]').forEach(button => {
    const active = button.dataset.authMode === nextMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });

  const supabaseMode = authUsesSupabase();
  const isSignup = nextMode === 'signup';
  const isReset = nextMode === 'reset';
  const isUpdate = nextMode === 'update';

  if (title) {
    title.textContent = isSignup
      ? 'Create your volunteer account'
      : isReset ? 'Reset your password'
        : isUpdate ? 'Set your new password'
          : 'Sign in to your volunteer dashboard';
  }

  if (copy) {
    if (!supabaseMode) {
      copy.textContent = 'Local demo sign-in is active because Supabase is not configured yet.';
    } else if (isSignup) {
      copy.textContent = 'Create an account with your email and password. New accounts start with the volunteer role.';
    } else if (isReset) {
      copy.textContent = 'Enter your account email. If it exists, Supabase will send password reset instructions.';
    } else if (isUpdate) {
      copy.textContent = 'Enter a new password to complete the reset. You will stay signed in after the password is updated.';
    } else {
      copy.textContent = 'Sign in with your Supabase email and password. Admin access comes from your app user role.';
    }
  }

  if (emailField) emailField.hidden = isUpdate;
  if (emailInput) emailInput.required = !isUpdate;

  if (nameField) nameField.hidden = !isSignup || !supabaseMode;
  if (nameInput) {
    nameInput.required = isSignup && supabaseMode;
    nameInput.autocomplete = isSignup ? 'name' : 'off';
  }

  if (passwordField) passwordField.hidden = isReset || !supabaseMode;
  if (passwordInput) {
    passwordInput.required = !isReset && supabaseMode;
    passwordInput.minLength = (isSignup || isUpdate) ? 8 : 0;
    passwordInput.autocomplete = (isSignup || isUpdate) ? 'new-password' : 'current-password';
    passwordInput.placeholder = isUpdate ? 'New password' : 'Password';
    if (isUpdate) passwordInput.value = '';
  }

  if (submit) {
    submit.textContent = isSignup ? 'Create account' : isReset ? 'Send reset email' : isUpdate ? 'Set new password' : supabaseMode ? 'Sign in' : 'Continue';
    submit.disabled = false;
  }

  setAuthStatus('');
}

async function createVolunteerAccount(email, password, fullName) {
  const supabase = authClient();
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authRedirectUrl(),
      data: { full_name: fullName }
    }
  });

  if (error) return { ok: false, reason: error.message };

  if (data?.user && data?.session) {
    await window.VolunteerDataStore?.refreshSupabaseSession?.();
    window.dispatchEvent(new CustomEvent('volunteer-auth-changed'));
    return { ok: true, signedIn: true };
  }

  return { ok: true, needsVerification: true };
}

async function sendPasswordReset(email) {
  const supabase = authClient();
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirectUrl()
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

async function updateRecoveredPassword(password) {
  const supabase = authClient();
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' };
  if (!password || password.length < 8) return { ok: false, reason: 'Use a password with at least 8 characters.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, reason: error.message };
  await window.VolunteerDataStore?.refreshSupabaseSession?.();
  window.dispatchEvent(new CustomEvent('volunteer-auth-changed'));
  return { ok: true };
}

function bindSupabaseAuthFormController() {
  const form = document.querySelector('[data-auth-form]');
  if (!form || form.dataset.supabaseAuthController === 'true') return;
  form.dataset.supabaseAuthController = 'true';

  form.addEventListener('submit', async event => {
    if (!authUsesSupabase()) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const data = new FormData(form);
    const mode = form.dataset.authMode || 'signin';
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const fullName = String(data.get('name') || '').trim();
    const submit = form.querySelector('button[type="submit"]');
    const originalText = submit?.textContent || 'Continue';

    if (mode !== 'update' && !email) {
      setAuthStatus('Enter your email address.', 'error');
      return;
    }
    if (mode === 'signup' && !fullName) {
      setAuthStatus('Enter your full name to create an account.', 'error');
      return;
    }
    if (mode !== 'reset' && password.length < (mode === 'signup' || mode === 'update' ? 8 : 1)) {
      setAuthStatus(mode === 'signup' || mode === 'update' ? 'Use a password with at least 8 characters.' : 'Enter your password.', 'error');
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.textContent = mode === 'signup' ? 'Creating account...' : mode === 'reset' ? 'Sending...' : mode === 'update' ? 'Updating...' : 'Signing in...';
    }
    setAuthStatus('');

    const result = mode === 'signup'
      ? await createVolunteerAccount(email, password, fullName)
      : mode === 'reset'
        ? await sendPasswordReset(email)
        : mode === 'update'
          ? await updateRecoveredPassword(password)
          : await window.VolunteerDataStore.signInWithPassword(email, password, fullName);

    if (submit) {
      submit.disabled = false;
      submit.textContent = originalText;
    }

    if (!result?.ok) {
      setAuthStatus(`Could not ${mode === 'signup' ? 'create account' : mode === 'reset' ? 'send reset email' : mode === 'update' ? 'update password' : 'sign in'}: ${result?.reason || 'Unknown error'}`, 'error');
      return;
    }

    if (mode === 'reset') {
      setAuthStatus('Password reset instructions have been sent if the email is registered.', 'success');
      return;
    }

    if (mode === 'signup' && result.needsVerification) {
      setAuthStatus('Account created. Check your email to verify the account, then sign in.', 'success');
      setAuthMode('signin');
      form.email.value = email;
      return;
    }

    if (mode === 'update') {
      setAuthStatus('Password updated. Redirecting to your dashboard...', 'success');
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#dashboard`);
    }

    if (typeof phaseOneCloseAuth === 'function') phaseOneCloseAuth();
    if (typeof phaseOneRenderDashboard === 'function') phaseOneRenderDashboard();
    if (typeof phaseOneSetActivePage === 'function') phaseOneSetActivePage('dashboard');
  }, true);
}

function isPasswordRecoveryUrl() {
  const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search || '');
  return hash.get('type') === 'recovery' || query.get('type') === 'recovery';
}

function openPasswordRecoveryModeIfNeeded() {
  if (!authUsesSupabase() || !isPasswordRecoveryUrl()) return;
  if (typeof phaseOneOpenAuth === 'function') phaseOneOpenAuth();
  window.setTimeout(() => {
    setAuthMode('update');
    setAuthStatus('Password reset verified. Enter a new password to continue.', 'success');
  }, 120);
}

function bindPasswordRecoveryEvent() {
  const supabase = authClient();
  if (!supabase || window.__passwordRecoveryEventBound) return;
  window.__passwordRecoveryEventBound = true;
  supabase.auth.onAuthStateChange(event => {
    if (event !== 'PASSWORD_RECOVERY') return;
    if (typeof phaseOneOpenAuth === 'function') phaseOneOpenAuth();
    window.setTimeout(() => {
      setAuthMode('update');
      setAuthStatus('Password reset verified. Enter a new password to continue.', 'success');
    }, 80);
  });
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
  installAuthModeControls();
  bindSupabaseAuthFormController();
  bindPasswordRecoveryEvent();
  moveDashboardNavToHeaderActions();
  syncDashboardAuthActions();
  bindProfileSavedFeedback();
  installProfileFormToggle();
  openPasswordRecoveryModeIfNeeded();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installHeaderAndAuthEnhancements);
} else {
  installHeaderAndAuthEnhancements();
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-auth-open]')) {
    window.setTimeout(() => setAuthMode('signin'), 0);
  }
}, true);

window.addEventListener('volunteer-auth-ready', () => {
  installAuthModeControls();
  bindSupabaseAuthFormController();
  bindPasswordRecoveryEvent();
  setAuthMode(document.querySelector('[data-auth-form]')?.dataset.authMode || 'signin');
  syncDashboardAuthActions();
  bindProfileSavedFeedback();
  installProfileFormToggle();
  openPasswordRecoveryModeIfNeeded();
});
window.addEventListener('volunteer-auth-changed', () => {
  installAuthModeControls();
  bindSupabaseAuthFormController();
  bindPasswordRecoveryEvent();
  setAuthMode(document.querySelector('[data-auth-form]')?.dataset.authMode || 'signin');
  syncDashboardAuthActions();
  bindProfileSavedFeedback();
  installProfileFormToggle();
  openPasswordRecoveryModeIfNeeded();
});
