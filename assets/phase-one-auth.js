const PHASE_ONE_SESSION_KEY = 'mendaki.volunteer.session.v1';
const PHASE_ONE_PROFILE_KEY = 'mendaki.volunteer.profile.v1';

function phaseOneReadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch (error) {
    console.warn(`Could not parse ${key}`, error);
    return null;
  }
}

function phaseOneWriteJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function phaseOneSession() {
  return phaseOneReadJson(PHASE_ONE_SESSION_KEY);
}

function phaseOneProfile() {
  return phaseOneReadJson(PHASE_ONE_PROFILE_KEY);
}

function phaseOneSetActivePage(page) {
  document.querySelectorAll('.page').forEach(section => {
    section.classList.toggle('active', section.id === `page-${page}`);
  });

  document.querySelectorAll('[data-page-target], [data-expansion-page-target]').forEach(button => {
    const target = button.dataset.expansionPageTarget || button.dataset.pageTarget;
    const active = target === page;
    button.classList.toggle('active', active);
    if (button.classList.contains('nav-link') || button.classList.contains('mobile-tab')) {
      button.setAttribute('aria-current', active ? 'page' : 'false');
    }
  });

  if (window.location.hash.replace('#', '') !== page) {
    history.pushState(null, '', `#${page}`);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function phaseOneOpenAuth() {
  const layer = document.querySelector('#auth-layer');
  const modal = document.querySelector('.auth-modal');
  if (!layer || !modal) return;
  const session = phaseOneSession();
  const profile = phaseOneProfile();
  const form = document.querySelector('[data-auth-form]');
  if (form) {
    form.email.value = session?.email || profile?.email || '';
    form.name.value = session?.name || profile?.name || '';
  }
  layer.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.focus({ preventScroll: true }));
}

function phaseOneCloseAuth() {
  const layer = document.querySelector('#auth-layer');
  if (!layer || layer.hidden) return;
  layer.hidden = true;
  document.body.style.overflow = '';
}

function phaseOneRenderDashboard() {
  const session = phaseOneSession();
  const profile = phaseOneProfile();
  const signedIn = Boolean(session?.email);
  const displayName = profile?.name || session?.name || 'Volunteer';
  const email = profile?.email || session?.email || 'Not signed in';
  const interest = profile?.interest || 'Not selected';
  const availability = profile?.availability || 'Not added';

  document.querySelectorAll('[data-auth-open]').forEach(button => {
    button.textContent = signedIn ? 'My dashboard' : 'Sign in';
  });
  document.querySelectorAll('[data-auth-sign-out]').forEach(button => {
    button.hidden = !signedIn;
  });

  const profileCopy = document.querySelector('[data-dashboard-profile-copy]');
  if (profileCopy) {
    profileCopy.textContent = signedIn
      ? 'Your profile is stored locally for Phase 1. It will map to the database profile table when auth is connected.'
      : 'Sign in to create your volunteer profile.';
  }

  const summary = document.querySelector('[data-profile-summary]');
  if (summary) {
    summary.replaceChildren(
      phaseOnePill('Name', signedIn ? displayName : 'Guest'),
      phaseOnePill('Email', email),
      phaseOnePill('Interest', formatPhaseOneInterest(interest)),
      phaseOnePill('Availability', availability)
    );
  }

  const form = document.querySelector('[data-profile-form]');
  if (form) {
    form.name.value = profile?.name || session?.name || '';
    form.email.value = profile?.email || session?.email || '';
    form.interest.value = profile?.interest || '';
    form.availability.value = profile?.availability || '';
  }
}

function phaseOnePill(label, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'profile-pill';
  const span = document.createElement('span');
  span.textContent = label;
  const strong = document.createElement('strong');
  strong.textContent = value || '—';
  wrapper.append(span, strong);
  return wrapper;
}

function formatPhaseOneInterest(value) {
  const labels = {
    mentor: 'Mentor',
    facilitator: 'Facilitator',
    befriender: 'Befriender',
    'community-volunteering': 'Community volunteer'
  };
  return labels[value] || value || 'Not selected';
}

function phaseOneSignOut() {
  localStorage.removeItem(PHASE_ONE_SESSION_KEY);
  phaseOneRenderDashboard();
}

function phaseOneBind() {
  document.addEventListener('click', event => {
    const expansionPage = event.target.closest('[data-expansion-page-target]');
    if (expansionPage) {
      event.preventDefault();
      event.stopPropagation();
      phaseOneSetActivePage(expansionPage.dataset.expansionPageTarget);
      return;
    }

    if (event.target.closest('[data-auth-open]')) {
      const session = phaseOneSession();
      if (session?.email) {
        phaseOneSetActivePage('dashboard');
      } else {
        phaseOneOpenAuth();
      }
      return;
    }

    if (event.target.closest('[data-auth-close]')) {
      phaseOneCloseAuth();
      return;
    }

    if (event.target.closest('[data-auth-sign-out]')) {
      phaseOneSignOut();
      return;
    }
  }, true);

  document.querySelector('[data-auth-form]')?.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const session = {
      email: String(data.get('email') || '').trim(),
      name: String(data.get('name') || '').trim(),
      role: 'volunteer',
      signedInAt: new Date().toISOString()
    };
    phaseOneWriteJson(PHASE_ONE_SESSION_KEY, session);
    const existing = phaseOneProfile() || {};
    phaseOneWriteJson(PHASE_ONE_PROFILE_KEY, {
      ...existing,
      email: session.email,
      name: session.name
    });
    phaseOneCloseAuth();
    phaseOneRenderDashboard();
    phaseOneSetActivePage('dashboard');
  });

  document.querySelector('[data-profile-form]')?.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const profile = {
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      interest: String(data.get('interest') || '').trim(),
      availability: String(data.get('availability') || '').trim(),
      updatedAt: new Date().toISOString()
    };
    phaseOneWriteJson(PHASE_ONE_PROFILE_KEY, profile);
    if (profile.email) {
      phaseOneWriteJson(PHASE_ONE_SESSION_KEY, {
        email: profile.email,
        name: profile.name,
        role: 'volunteer',
        signedInAt: new Date().toISOString()
      });
    }
    phaseOneRenderDashboard();
  });

  window.addEventListener('hashchange', () => {
    if (window.location.hash.replace('#', '') === 'dashboard') {
      phaseOneSetActivePage('dashboard');
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') phaseOneCloseAuth();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  phaseOneBind();
  phaseOneRenderDashboard();
  if (window.location.hash.replace('#', '') === 'dashboard') {
    phaseOneSetActivePage('dashboard');
  }
});
