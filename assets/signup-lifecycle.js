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
  lifecycleEnhanceOpportunityCards();
  lifecycleObserver.observe(document.body, { childList: true, subtree: true });
});

window.addEventListener('storage', lifecycleEnhanceOpportunityCards);
