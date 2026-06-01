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

let lifecycleObserver = null;
let lifecycleRenderQueued = false;

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

    const nextText = lifecycleOpportunityStatusText(id);
    if (status.textContent !== nextText) status.textContent = nextText;
  });
}

function lifecycleScheduleEnhance() {
  if (lifecycleRenderQueued) return;
  lifecycleRenderQueued = true;
  window.requestAnimationFrame(() => {
    lifecycleRenderQueued = false;
    lifecycleObserver?.disconnect();
    lifecycleEnhanceOpportunityCards();
    lifecycleObserveOpportunityContainers();
  });
}

function lifecycleObserveOpportunityContainers() {
  if (!lifecycleObserver) return;
  const targets = [
    document.querySelector('#opportunities-grid'),
    document.querySelector('#home-opportunities')
  ].filter(Boolean);

  targets.forEach(target => {
    lifecycleObserver.observe(target, { childList: true });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  lifecycleObserver = new MutationObserver(lifecycleScheduleEnhance);
  lifecycleEnhanceOpportunityCards();
  lifecycleObserveOpportunityContainers();
});

window.addEventListener('storage', lifecycleScheduleEnhance);
