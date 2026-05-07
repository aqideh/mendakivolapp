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
    const id = card.dataset.oppId;
    if (!id) return;

    let status = card.querySelector('.signup-lifecycle-summary');
    if (!status) {
      status = document.createElement('p');
      status.className = 'signup-lifecycle-summary';
      const actionArea = card.querySelector('.opp-swipe-actions') || card;
      actionArea.insertAdjacentElement(actionArea.classList.contains('opp-swipe-actions') ? 'beforebegin' : 'beforeend', status);
    }

    status.textContent = lifecycleOpportunityStatusText(id);
  });
}

const lifecycleObserver = new MutationObserver(() => lifecycleEnhanceOpportunityCards());

document.addEventListener('DOMContentLoaded', () => {
  lifecycleEnhanceOpportunityCards();
  lifecycleObserver.observe(document.body, { childList: true, subtree: true });
});

window.addEventListener('storage', lifecycleEnhanceOpportunityCards);
