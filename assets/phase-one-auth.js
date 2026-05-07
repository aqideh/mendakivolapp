const PHASE_ONE_SESSION_KEY = VolunteerDataStore.keys.session;
const PHASE_ONE_PROFILE_KEY = VolunteerDataStore.keys.profile;
const PHASE_TWO_SIGNUPS_KEY = VolunteerDataStore.keys.opportunitySignups;

function phaseOneReadJson(key) {
  return VolunteerDataStore.readJson(key, null);
}

function phaseOneWriteJson(key, value) {
  return VolunteerDataStore.writeJson(key, value);
}

function phaseOneSession() {
  return VolunteerDataStore.normaliseSessionRole();
}

function phaseOneProfile() {
  return VolunteerDataStore.getProfile();
}

function phaseTwoSignups() {
  return VolunteerDataStore.getOpportunitySignups();
}

function phaseTwoWriteSignups(signups) {
  return VolunteerDataStore.saveOpportunitySignups(signups);
}

function phaseTwoCurrentVolunteerEmail() {
  return VolunteerDataStore.currentEmail();
}

function phaseTwoIsAdmin() {
  return VolunteerDataStore.isAdmin();
}

function phaseOneUsingSupabase() {
  return Boolean(VolunteerDataStore.authState?.usingSupabase);
}

function phaseTwoStatusLabel(status) {
  const labels = {
    pending_review: 'Pending review',
    registered: 'Pending review',
    confirmed: 'Confirmed',
    waitlisted: 'Waitlisted',
    declined: 'Not selected',
    cancelled: 'Cancelled',
    completed: 'Completed'
  };
  return labels[status] || status || 'Pending review';
}

function phaseTwoStatusBadgeClass(status) {
  if (status === 'confirmed') return 'badge-open';
  if (status === 'completed') return 'badge-open';
  if (status === 'waitlisted') return 'badge-programme';
  if (status === 'declined' || status === 'cancelled') return 'badge-ad-hoc';
  return 'badge-volunteer';
}

function phaseTwoActiveStatuses() {
  return ['pending_review', 'registered', 'confirmed', 'waitlisted'];
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
  const copy = document.querySelector('[data-auth-copy]');
  const submit = form?.querySelector('button[type="submit"]');
  const passwordField = form?.querySelector('[data-auth-password-field]');
  const passwordInput = form?.querySelector('input[name="password"]');
  if (form) {
    form.email.value = session?.email || profile?.email || '';
    form.name.value = session?.name || profile?.name || '';
  }
  if (passwordField) passwordField.hidden = !phaseOneUsingSupabase();
  if (passwordInput) passwordInput.required = phaseOneUsingSupabase();
  if (copy) {
    copy.textContent = phaseOneUsingSupabase()
      ? 'Sign in with your Supabase email and password. Admin access comes from your app user role.'
      : 'Local demo sign-in is active because Supabase is not configured yet.';
  }
  if (submit) {
    submit.textContent = phaseOneUsingSupabase() ? 'Sign in' : 'Continue';
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
      ? (phaseOneUsingSupabase() ? 'Signed in with Supabase Auth. App roles should come from the app_users table.' : 'Your profile is stored locally for review. Production sign-ups should map to the database sign-up lifecycle.')
      : 'Sign in to create your volunteer profile.';
  }

  const summary = document.querySelector('[data-profile-summary]');
  if (summary) {
    summary.replaceChildren(
      phaseOnePill('Name', signedIn ? displayName : 'Guest'),
      phaseOnePill('Email', email),
      phaseOnePill('Role', signedIn ? (session?.role || 'volunteer') : 'Not signed in'),
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

async function phaseOneSignOut() {
  await VolunteerDataStore.signOut();
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
  return phaseTwoSignups().some(item => item.email === email && String(item.opportunityId) === String(oppId) && phaseTwoActiveStatuses().includes(item.status));
}

function phaseTwoUserSignupForOpportunity(oppId) {
  const email = phaseTwoCurrentVolunteerEmail();
  return phaseTwoSignups().find(item => item.email === email && String(item.opportunityId) === String(oppId) && item.status !== 'cancelled');
}

function phaseTwoSignupCounts(oppId) {
  const signups = phaseTwoSignups().filter(item => String(item.opportunityId) === String(oppId));
  return {
    pending: signups.filter(item => item.status === 'pending_review' || item.status === 'registered').length,
    confirmed: signups.filter(item => item.status === 'confirmed' || item.status === 'completed').length,
    waitlisted: signups.filter(item => item.status === 'waitlisted').length,
    completed: signups.filter(item => item.status === 'completed').length
  };
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
    status: 'pending_review',
    signedUpAt: existing?.signedUpAt || new Date().toISOString(),
    reviewedAt: '',
    reviewedBy: '',
    adminNotes: '',
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, record);
  } else {
    signups.push(record);
  }
  phaseTwoWriteSignups(signups);
  phaseTwoRenderDashboardSignups();
  if (typeof renderOpportunities === 'function') renderOpportunities();
  return { ok: true, signup: record };
}

function phaseTwoCancelSignup(oppId) {
  const email = phaseTwoCurrentVolunteerEmail();
  const signups = phaseTwoSignups();
  const existing = signups.find(item => item.email === email && String(item.opportunityId) === String(oppId) && phaseTwoActiveStatuses().includes(item.status));
  if (!existing) return { ok: false, reason: 'not_found' };
  existing.status = 'cancelled';
  existing.cancelledAt = new Date().toISOString();
  existing.updatedAt = new Date().toISOString();
  phaseTwoWriteSignups(signups);
  phaseTwoRenderDashboardSignups();
  if (typeof renderOpportunities === 'function') renderOpportunities();
  return { ok: true };
}

function phaseTwoUpdateSignupStatus(signupId, status) {
  if (!phaseTwoIsAdmin()) return { ok: false, reason: 'not_authorised' };
  const signups = phaseTwoSignups();
  const signup = signups.find(item => item.id === signupId);
  if (!signup) return { ok: false, reason: 'not_found' };
  signup.status = status;
  signup.reviewedAt = new Date().toISOString();
  signup.reviewedBy = phaseTwoCurrentVolunteerEmail() || 'admin';
  signup.updatedAt = new Date().toISOString();
  if (status === 'confirmed') signup.confirmedAt = signup.reviewedAt;
  if (status === 'waitlisted') signup.waitlistedAt = signup.reviewedAt;
  if (status === 'declined') signup.declinedAt = signup.reviewedAt;
  phaseTwoWriteSignups(signups);
  phaseTwoRenderDashboardSignups();
  if (typeof renderOpportunities === 'function') renderOpportunities();
  if (typeof phaseThreeRender === 'function') phaseThreeRender();
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
      <div><h2>My opportunity sign-ups</h2><p class="dashboard-muted">Sign-ups move from Pending review to Confirmed once an admin accepts your slot.</p></div>
      <button class="text-button" type="button" data-page-target="opportunities">Browse more</button>
    </div>
    <div class="signup-list" data-upcoming-signups></div>
  `;

  const completed = document.createElement('section');
  completed.className = 'dashboard-card signup-dashboard-card';
  completed.dataset.signupDashboardCard = 'completed';
  completed.innerHTML = `
    <h2>Completed opportunities</h2>
    <p class="dashboard-muted">Completed opportunities appear here only after attendance is verified.</p>
    <div class="signup-list" data-completed-signups></div>
  `;

  const admin = document.createElement('section');
  admin.className = 'dashboard-card signup-dashboard-card admin-signup-card';
  admin.dataset.signupDashboardCard = 'admin';
  admin.hidden = true;
  admin.innerHTML = `
    <div class="section-header">
      <div><h2>Admin sign-up review</h2><p class="dashboard-muted">View all opportunity sign-ups and confirm, waitlist, or decline volunteers.</p></div>
    </div>
    <div class="signup-list" data-admin-signups></div>
  `;

  const statsCard = document.querySelector('#stats-title')?.closest('.dashboard-card');
  if (statsCard) {
    statsCard.insertAdjacentElement('afterend', upcoming);
    upcoming.insertAdjacentElement('afterend', completed);
    completed.insertAdjacentElement('afterend', admin);
  } else {
    layout.append(upcoming, completed, admin);
  }
}

function phaseTwoRenderDashboardSignups() {
  const email = phaseTwoCurrentVolunteerEmail();
  const signedIn = Boolean(email);
  const userSignups = signedIn ? phaseTwoSignups().filter(item => item.email === email) : [];
  const activeSignups = userSignups.filter(item => phaseTwoActiveStatuses().includes(item.status));
  const confirmedSignups = userSignups.filter(item => item.status === 'confirmed');
  const completedSignups = userSignups.filter(item => item.status === 'completed');
  const verifiedHours = completedSignups.reduce((total, item) => total + Number(item.verifiedHours || item.hours || 0), 0);

  const hoursNode = document.querySelector('[data-stat-hours]');
  const upcomingNode = document.querySelector('[data-stat-upcoming]');
  const completedNode = document.querySelector('[data-stat-completed]');
  if (hoursNode) hoursNode.textContent = String(verifiedHours);
  if (upcomingNode) upcomingNode.textContent = String(confirmedSignups.length);
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

  phaseTwoRenderAdminSignupQueue();
}

function phaseTwoSignupRow(signup) {
  const row = document.createElement('div');
  row.className = 'signup-row';
  row.innerHTML = `
    <div>
      <strong>${escapePhaseTwo(signup.title)}</strong>
      <p>${escapePhaseTwo(signup.time || 'Time to be confirmed')} · ${escapePhaseTwo(signup.location || 'Location to be confirmed')}</p>
      ${signup.status === 'pending_review' || signup.status === 'registered' ? '<p>MENDAKI will review and confirm your slot.</p>' : ''}
      ${signup.status === 'confirmed' ? '<p>You are confirmed. Check in when you arrive.</p>' : ''}
      ${signup.status === 'waitlisted' ? '<p>You are waitlisted. MENDAKI will update you if a slot opens.</p>' : ''}
      ${signup.status === 'declined' ? '<p>You were not selected for this opportunity.</p>' : ''}
    </div>
    <span class="badge ${phaseTwoStatusBadgeClass(signup.status)}">${escapePhaseTwo(phaseTwoStatusLabel(signup.status))}</span>
  `;
  if (phaseTwoActiveStatuses().includes(signup.status)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.textContent = 'Cancel';
    button.dataset.cancelSignup = signup.opportunityId;
    row.append(button);
  }
  return row;
}

function phaseTwoRenderAdminSignupQueue() {
  const card = document.querySelector('[data-signup-dashboard-card="admin"]');
  const list = document.querySelector('[data-admin-signups]');
  if (!card || !list) return;
  const isAdmin = phaseTwoIsAdmin();
  card.hidden = !isAdmin;
  if (!isAdmin) return;

  const signups = phaseTwoSignups().filter(item => item.status !== 'cancelled').sort((a, b) => new Date(b.updatedAt || b.signedUpAt || 0) - new Date(a.updatedAt || a.signedUpAt || 0));
  list.replaceChildren();
  if (!signups.length) {
    list.append(phaseTwoEmptyRow('No opportunity sign-ups yet.'));
    return;
  }
  signups.forEach(signup => list.append(phaseTwoAdminSignupRow(signup)));
}

function phaseTwoAdminSignupRow(signup) {
  const row = document.createElement('div');
  row.className = 'signup-row admin-signup-row';
  row.innerHTML = `
    <div>
      <strong>${escapePhaseTwo(signup.volunteerName || 'Volunteer')}</strong>
      <p>${escapePhaseTwo(signup.email)} · ${escapePhaseTwo(signup.title)}</p>
      <p>${escapePhaseTwo(signup.time || 'Time to be confirmed')} · ${escapePhaseTwo(signup.location || 'Location to be confirmed')}</p>
    </div>
    <span class="badge ${phaseTwoStatusBadgeClass(signup.status)}">${escapePhaseTwo(phaseTwoStatusLabel(signup.status))}</span>
  `;
  const actions = document.createElement('div');
  actions.className = 'signup-admin-actions';
  if (signup.status !== 'confirmed' && signup.status !== 'completed') actions.append(phaseTwoAdminButton('Confirm', signup.id, 'confirmed'));
  if (signup.status !== 'waitlisted' && signup.status !== 'completed') actions.append(phaseTwoAdminButton('Waitlist', signup.id, 'waitlisted'));
  if (signup.status !== 'declined' && signup.status !== 'completed') actions.append(phaseTwoAdminButton('Decline', signup.id, 'declined'));
  row.append(actions);
  return row;
}

function phaseTwoAdminButton(text, signupId, status) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = status === 'confirmed' ? 'button button-primary' : 'button dashboard-secondary';
  button.textContent = text;
  button.dataset.adminSignupStatus = status;
  button.dataset.signupId = signupId;
  return button;
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

  const signup = phaseTwoUserSignupForOpportunity(oppId);
  const signedUp = Boolean(signup && phaseTwoActiveStatuses().includes(signup.status));
  const signupButton = document.createElement('button');
  signupButton.type = 'button';
  signupButton.className = 'button button-primary';
  signupButton.dataset.signupOpportunity = String(oppId);
  signupButton.textContent = signedUp ? phaseTwoStatusLabel(signup.status) : 'Sign up for this role';
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
      signupButton.textContent = 'Pending review';
      signupButton.disabled = true;
      phaseTwoShowModalNotice('Your sign-up is pending review. It will appear in your dashboard.');
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

    const adminStatusButton = event.target.closest('[data-admin-signup-status]');
    if (adminStatusButton) {
      event.preventDefault();
      phaseTwoUpdateSignupStatus(adminStatusButton.dataset.signupId, adminStatusButton.dataset.adminSignupStatus);
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

  document.querySelector('[data-auth-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') || '').trim();
    const name = String(data.get('name') || '').trim();
    const password = String(data.get('password') || '');
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    const originalText = submit?.textContent;

    if (phaseOneUsingSupabase()) {
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Signing in...';
      }
      const result = await VolunteerDataStore.signInWithPassword(email, password, name);
      if (submit) {
        submit.disabled = false;
        submit.textContent = originalText || 'Sign in';
      }
      if (!result.ok) {
        window.alert(`Could not sign in: ${result.reason}`);
        return;
      }
      phaseOneCloseAuth();
      phaseOneRenderDashboard();
      phaseOneSetActivePage('dashboard');
      return;
    }

    const session = {
      email,
      name,
      role: VolunteerDataStore.roleForEmail(email),
      signedInAt: new Date().toISOString(),
      provider: 'local-demo'
    };
    VolunteerDataStore.saveSession(session);
    const existing = phaseOneProfile() || {};
    VolunteerDataStore.saveProfile({
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
    VolunteerDataStore.saveProfile(profile);
    if (profile.email && !phaseOneUsingSupabase()) {
      VolunteerDataStore.saveSession({
        email: profile.email,
        name: profile.name,
        role: VolunteerDataStore.roleForEmail(profile.email),
        signedInAt: new Date().toISOString(),
        provider: 'local-demo'
      });
    }
    phaseOneRenderDashboard();
  });

  window.addEventListener('hashchange', () => {
    if (window.location.hash.replace('#', '') === 'dashboard') {
      phaseOneSetActivePage('dashboard');
    }
  });

  window.addEventListener('volunteer-auth-ready', () => {
    phaseOneRenderDashboard();
  });

  window.addEventListener('volunteer-auth-changed', () => {
    phaseOneRenderDashboard();
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
