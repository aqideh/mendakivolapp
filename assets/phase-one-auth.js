const PHASE_ONE_SESSION_KEY = 'mendaki.volunteer.session.v1';
const PHASE_ONE_PROFILE_KEY = 'mendaki.volunteer.profile.v1';
const PHASE_TWO_SIGNUPS_KEY = 'mendaki.volunteer.signups.v1';

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

function phaseTwoSignups() {
  const value = phaseOneReadJson(PHASE_TWO_SIGNUPS_KEY);
  return Array.isArray(value) ? value : [];
}

function phaseTwoWriteSignups(signups) {
  phaseOneWriteJson(PHASE_TWO_SIGNUPS_KEY, signups);
}

function phaseTwoCurrentVolunteerEmail() {
  return phaseOneProfile()?.email || phaseOneSession()?.email || '';
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

function phaseOneRenderAuthNavigation(signedIn) {
  document.querySelectorAll('[data-auth-entry]').forEach(button => {
    button.hidden = signedIn;
    button.textContent = 'Sign in';
  });
  document.querySelectorAll('[data-dashboard-nav]').forEach(button => {
    button.hidden = !signedIn;
  });
}

function phaseOneRenderDashboard() {
  const session = phaseOneSession();
  const profile = phaseOneProfile();
  const signedIn = Boolean(session?.email);
  const displayName = profile?.name || session?.name || 'Volunteer';
  const email = profile?.email || session?.email || 'Not signed in';
  const interest = profile?.interest || 'Not selected';
  const availability = profile?.availability || 'Not added';

  phaseOneRenderAuthNavigation(signedIn);
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

  phaseTwoEnsureDashboardSections();
  phaseTwoRenderDashboardSignups();
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
  phaseOneSetActivePage('home');
}

function phaseTwoAppState() {
  try {
    return typeof state !== 'undefined' ? state : null;
  } catch (error) {
    return null;
  }
}

function phaseTwoOpportunities() {
  return phaseTwoAppState()?.data?.opportunities || [];
}

function phaseTwoFindOpportunity(id) {
  return phaseTwoOpportunities().find(item => String(item.id) === String(id));
}

function phaseTwoOpportunityHours(opp) {
  const match = String(opp?.time || '').match(/(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)/i);
  if (match) return Number(match[1]);
  return opp?.type === 'long-term' ? 2 : 4;
}

function phaseTwoIsSignedUp(oppId) {
  const email = phaseTwoCurrentVolunteerEmail();
  return phaseTwoSignups().some(item => item.email === email && String(item.opportunityId) === String(oppId) && item.status === 'registered');
}

function phaseTwoCreateSignup(oppId) {
  const session = phaseOneSession();
  const profile = phaseOneProfile();
  if (!session?.email && !profile?.email) {
    phaseOneOpenAuth();
    return { ok: false, reason: 'auth_required' };
  }

  const opp = phaseTwoFindOpportunity(oppId);
  if (!opp) return { ok: false, reason: 'not_found' };

  const email = phaseTwoCurrentVolunteerEmail();
  const signups = phaseTwoSignups();
  const existing = signups.find(item => item.email === email && String(item.opportunityId) === String(oppId));
  const record = {
    id: existing?.id || crypto.randomUUID(),
    opportunityId: String(opp.id),
    email,
    volunteerName: profile?.name || session?.name || 'Volunteer',
    title: opp.title,
    type: opp.type,
    category: opp.category,
    time: opp.time,
    location: opp.location,
    commitment: opp.commitment,
    hours: phaseTwoOpportunityHours(opp),
    status: 'registered',
    signedUpAt: existing?.signedUpAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, record);
  } else {
    signups.push(record);
  }
  phaseTwoWriteSignups(signups);
  phaseTwoRenderDashboardSignups();
  return { ok: true, signup: record };
}

function phaseTwoCancelSignup(oppId) {
  const email = phaseTwoCurrentVolunteerEmail();
  const signups = phaseTwoSignups();
  const existing = signups.find(item => item.email === email && String(item.opportunityId) === String(oppId) && item.status === 'registered');
  if (!existing) return { ok: false, reason: 'not_found' };
  existing.status = 'cancelled';
  existing.cancelledAt = new Date().toISOString();
  existing.updatedAt = new Date().toISOString();
  phaseTwoWriteSignups(signups);
  phaseTwoRenderDashboardSignups();
  return { ok: true };
}

function phaseTwoEnsureDashboardSections() {
  const layout = document.querySelector('.dashboard-layout');
  if (!layout || document.querySelector('[data-signup-dashboard-card]')) return;

  const upcoming = document.createElement('section');
  upcoming.className = 'dashboard-card signup-dashboard-card';
  upcoming.dataset.signupDashboardCard = 'upcoming';
  upcoming.innerHTML = `
    <div class="section-header">
      <div><h2>My sign-ups</h2><p class="dashboard-muted">Opportunities you have registered for.</p></div>
      <button class="text-button" type="button" data-page-target="opportunities">Browse more</button>
    </div>
    <div class="signup-list" data-upcoming-signups></div>
  `;

  const completed = document.createElement('section');
  completed.className = 'dashboard-card signup-dashboard-card';
  completed.dataset.signupDashboardCard = 'completed';
  completed.innerHTML = `
    <h2>Attendance preview</h2>
    <p class="dashboard-muted">Phase 2 tracks sign-ups. Attendance self-reporting and admin verification will be implemented in the next phase.</p>
    <div class="signup-list" data-completed-signups></div>
  `;

  const statsCard = document.querySelector('#stats-title')?.closest('.dashboard-card');
  if (statsCard) {
    statsCard.insertAdjacentElement('afterend', upcoming);
    upcoming.insertAdjacentElement('afterend', completed);
  } else {
    layout.append(upcoming, completed);
  }
}

function phaseTwoRenderDashboardSignups() {
  const email = phaseTwoCurrentVolunteerEmail();
  const signedIn = Boolean(email);
  const userSignups = signedIn ? phaseTwoSignups().filter(item => item.email === email) : [];
  const activeSignups = userSignups.filter(item => item.status === 'registered');
  const completedSignups = userSignups.filter(item => item.status === 'completed');
  const verifiedHours = completedSignups.reduce((total, item) => total + Number(item.verifiedHours || item.hours || 0), 0);

  const hoursNode = document.querySelector('[data-stat-hours]');
  const upcomingNode = document.querySelector('[data-stat-upcoming]');
  const completedNode = document.querySelector('[data-stat-completed]');
  if (hoursNode) hoursNode.textContent = String(verifiedHours);
  if (upcomingNode) upcomingNode.textContent = String(activeSignups.length);
  if (completedNode) completedNode.textContent = String(completedSignups.length);

  const upcomingList = document.querySelector('[data-upcoming-signups]');
  const completedList = document.querySelector('[data-completed-signups]');
  if (upcomingList) {
    upcomingList.replaceChildren(...(
      signedIn
        ? activeSignups.map(phaseTwoSignupRow)
        : [phaseTwoEmptyRow('Sign in to view your opportunity sign-ups.')]
    ));
    if (signedIn && activeSignups.length === 0) upcomingList.append(phaseTwoEmptyRow('No active sign-ups yet.'));
  }
  if (completedList) {
    completedList.replaceChildren(...(
      signedIn
        ? completedSignups.map(phaseTwoSignupRow)
        : [phaseTwoEmptyRow('Completed opportunities will appear here after attendance is verified.')]
    ));
    if (signedIn && completedSignups.length === 0) completedList.append(phaseTwoEmptyRow('No completed opportunities yet.'));
  }
}

function phaseTwoSignupRow(signup) {
  const row = document.createElement('div');
  row.className = 'signup-row';
  row.innerHTML = `
    <div>
      <strong>${escapePhaseTwo(signup.title)}</strong>
      <p>${escapePhaseTwo(signup.time || 'Time to be confirmed')} · ${escapePhaseTwo(signup.location || 'Location to be confirmed')}</p>
    </div>
    <span class="badge ${signup.status === 'registered' ? 'badge-open' : 'badge-volunteer'}">${escapePhaseTwo(signup.status)}</span>
  `;
  if (signup.status === 'registered') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.textContent = 'Cancel';
    button.dataset.cancelSignup = signup.opportunityId;
    row.append(button);
  }
  return row;
}

function phaseTwoEmptyRow(text) {
  const row = document.createElement('div');
  row.className = 'signup-empty';
  row.textContent = text;
  return row;
}

function escapePhaseTwo(value) {
  return String(value || '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function phaseTwoPatchOpportunityModal(oppId) {
  const modal = document.querySelector('#modal');
  const actions = modal?.querySelector('.modal-actions');
  const opp = phaseTwoFindOpportunity(oppId);
  if (!modal || !actions || !opp) return;
  const externalRegister = actions.querySelector('a.button-primary');
  if (!externalRegister || actions.querySelector('[data-signup-opportunity]')) return;

  const signedUp = phaseTwoIsSignedUp(oppId);
  const signupButton = document.createElement('button');
  signupButton.type = 'button';
  signupButton.className = 'button button-primary';
  signupButton.dataset.signupOpportunity = String(oppId);
  signupButton.textContent = signedUp ? 'Already signed up' : 'Sign up for this role';
  signupButton.disabled = signedUp;
  externalRegister.replaceWith(signupButton);

  if (signedUp) {
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button dashboard-secondary';
    cancelButton.dataset.cancelSignup = String(oppId);
    cancelButton.textContent = 'Cancel sign-up';
    actions.insertBefore(cancelButton, actions.firstChild.nextSibling);
  }
}

function phaseTwoShowModalNotice(message, variant = 'success') {
  const modal = document.querySelector('#modal');
  const actions = modal?.querySelector('.modal-actions');
  if (!modal || !actions) return;
  modal.querySelector('.signup-notice')?.remove();
  const notice = document.createElement('div');
  notice.className = `signup-notice ${variant}`;
  notice.textContent = message;
  actions.insertAdjacentElement('beforebegin', notice);
}

function phaseTwoBind() {
  let pendingOpportunityId = null;

  document.addEventListener('click', event => {
    const oppCard = event.target.closest('[data-opp-id]');
    if (oppCard) {
      pendingOpportunityId = oppCard.dataset.oppId;
      window.setTimeout(() => phaseTwoPatchOpportunityModal(pendingOpportunityId), 0);
      return;
    }

    const signupButton = event.target.closest('[data-signup-opportunity]');
    if (signupButton) {
      event.preventDefault();
      const result = phaseTwoCreateSignup(signupButton.dataset.signupOpportunity);
      if (!result.ok && result.reason === 'auth_required') return;
      if (!result.ok) {
        phaseTwoShowModalNotice('Could not create this sign-up. Please try again.', 'error');
        return;
      }
      phaseTwoPatchOpportunityModal(signupButton.dataset.signupOpportunity);
      signupButton.textContent = 'Already signed up';
      signupButton.disabled = true;
      phaseTwoShowModalNotice('You are signed up. This now appears in your dashboard.');
      return;
    }

    const cancelButton = event.target.closest('[data-cancel-signup]');
    if (cancelButton) {
      event.preventDefault();
      const result = phaseTwoCancelSignup(cancelButton.dataset.cancelSignup);
      if (result.ok) {
        phaseTwoRenderDashboardSignups();
        phaseTwoShowModalNotice('Your sign-up was cancelled.', 'success');
        cancelButton.remove();
        const modalSignup = document.querySelector('[data-signup-opportunity]');
        if (modalSignup) {
          modalSignup.disabled = false;
          modalSignup.textContent = 'Sign up for this role';
        }
      }
    }
  }, true);

  const observer = new MutationObserver(() => {
    if (pendingOpportunityId) phaseTwoPatchOpportunityModal(pendingOpportunityId);
  });
  const modal = document.querySelector('#modal');
  if (modal) observer.observe(modal, { childList: true, subtree: true });
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
  phaseTwoBind();
  phaseOneRenderDashboard();
  if (window.location.hash.replace('#', '') === 'dashboard') {
    phaseOneSetActivePage('dashboard');
  }
});
