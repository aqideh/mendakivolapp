function lifecycleSignupCounts(opportunityId) {
  if (typeof phaseTwoSignupCounts === 'function') return phaseTwoSignupCounts(opportunityId);
  return { pending: 0, confirmed: 0, waitlisted: 0, completed: 0 };
}

function lifecycleOpportunityStatusText(opportunityId) {
  const counts = lifecycleSignupCounts(opportunityId);
  const parts = [];
  if (counts.confirmed) parts.push(`${counts.confirmed} confirmed`);
  if (counts.pending) parts.push(`${counts.pending} pending review`);
  if (counts.waitlisted) parts.push(`${counts.waitlisted} waitlisted`);
  if (counts.completed) parts.push(`${counts.completed} completed`);
  return parts.length ? parts.join(' · ') : 'No sign-ups yet';
}

function lifecycleEnhanceOpportunityCards() {
  document.querySelectorAll('[data-opp-id]').forEach(card => {
    if (card.dataset.lifecycleEnhanced === 'true') return;
    const id = card.dataset.oppId;
    if (!id) return;
    const status = document.createElement('p');
    status.className = 'signup-lifecycle-summary';
    status.textContent = lifecycleOpportunityStatusText(id);
    const actionArea = card.querySelector('.opp-swipe-actions') || card;
    actionArea.insertAdjacentElement(actionArea.classList.contains('opp-swipe-actions') ? 'beforebegin' : 'beforeend', status);
    card.dataset.lifecycleEnhanced = 'true';
  });
}

function lifecycleConfirmedSignupsOnly(signups) {
  return signups.filter(signup => signup.status === 'confirmed' || signup.status === 'completed');
}

function lifecycleReadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch (error) {
    return null;
  }
}

function lifecycleWriteJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function lifecycleRoleForEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  return value.startsWith('admin@') || value.includes('+admin@') ? 'admin' : 'volunteer';
}

function lifecycleCurrentEmail() {
  const profile = lifecycleReadJson('mendaki.volunteer.profile.v1') || {};
  const session = lifecycleReadJson('mendaki.volunteer.session.v1') || {};
  return String(profile.email || session.email || '').trim().toLowerCase();
}

function lifecycleIsAdmin() {
  const session = lifecycleReadJson('mendaki.volunteer.session.v1') || {};
  const role = String(session.role || '').toLowerCase();
  return role === 'admin' || role === 'super_admin' || lifecycleRoleForEmail(lifecycleCurrentEmail()) === 'admin';
}

function lifecycleNormaliseAdminSession() {
  const session = lifecycleReadJson('mendaki.volunteer.session.v1');
  if (!session?.email) return;
  const role = lifecycleRoleForEmail(session.email);
  if (session.role !== role) {
    lifecycleWriteJson('mendaki.volunteer.session.v1', { ...session, role });
  }
}

function lifecycleInstallAdminOverrides() {
  if (typeof phaseTwoIsAdmin === 'function') phaseTwoIsAdmin = lifecycleIsAdmin;
  if (typeof phaseThreeIsAdmin === 'function') phaseThreeIsAdmin = lifecycleIsAdmin;
  if (typeof phaseFourIsAdmin === 'function') phaseFourIsAdmin = lifecycleIsAdmin;
}

function lifecycleRefreshAdminSections() {
  lifecycleNormaliseAdminSession();
  lifecycleInstallAdminOverrides();
  if (typeof phaseOneRenderDashboard === 'function') phaseOneRenderDashboard();
  if (typeof phaseThreeRender === 'function') phaseThreeRender();
  if (typeof phaseFourRender === 'function') phaseFourRender();
  document.querySelectorAll('[data-signup-dashboard-card="admin"], [data-attendance-card="admin"], [data-training-dashboard-card="admin"]').forEach(card => {
    card.hidden = !lifecycleIsAdmin();
  });
}

if (typeof phaseThreeRenderVolunteerAttendance === 'function') {
  const originalPhaseThreeRenderVolunteerAttendance = phaseThreeRenderVolunteerAttendance;
  phaseThreeRenderVolunteerAttendance = function lifecyclePhaseThreeRenderVolunteerAttendance() {
    const list = document.querySelector('[data-attendance-list]');
    if (!list || typeof phaseThreeEmail !== 'function' || typeof phaseThreeSignups !== 'function') {
      originalPhaseThreeRenderVolunteerAttendance();
      return;
    }

    const email = phaseThreeEmail();
    const allSignups = phaseThreeSignups().filter(signup => signup.email === email && signup.status !== 'cancelled');
    const signups = lifecycleConfirmedSignupsOnly(allSignups);
    list.replaceChildren();

    if (typeof phaseThreeIsSignedIn === 'function' && !phaseThreeIsSignedIn()) {
      list.append(phaseThreeEmpty('Sign in to check in and check out of confirmed volunteer opportunities.'));
      return;
    }

    if (!allSignups.length) {
      list.append(phaseThreeEmpty('No sign-ups available for attendance yet.'));
      return;
    }

    if (!signups.length) {
      list.append(phaseThreeEmpty('Only confirmed opportunities are available for check-in. Pending review and waitlisted sign-ups will appear here after admin confirmation.'));
      return;
    }

    signups.forEach(signup => list.append(phaseThreeVolunteerRow(signup)));
  };
}

const lifecycleObserver = new MutationObserver(() => lifecycleEnhanceOpportunityCards());
document.addEventListener('DOMContentLoaded', () => {
  lifecycleInstallAdminOverrides();
  lifecycleEnhanceOpportunityCards();
  lifecycleObserver.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(lifecycleRefreshAdminSections, 0);
});

document.addEventListener('submit', event => {
  if (event.target.closest('[data-auth-form], [data-profile-form]')) {
    window.setTimeout(lifecycleRefreshAdminSections, 0);
  }
}, true);

document.addEventListener('click', event => {
  if (event.target.closest('[data-auth-sign-out]')) {
    window.setTimeout(lifecycleRefreshAdminSections, 0);
  }
}, true);

window.addEventListener('storage', () => {
  lifecycleEnhanceOpportunityCards();
  lifecycleRefreshAdminSections();
});
