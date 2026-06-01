const MANAGED_YM_HUB_SIGNUP_URL = 'https://www.mendaki.org.sg/login';

function managedSignupMake(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  });
  children.filter(Boolean).forEach(child => node.append(child));
  return node;
}

function managedSignupOpportunity(id) {
  try {
    return typeof state !== 'undefined'
      ? state.data?.opportunities?.find(item => String(item.id) === String(id))
      : null;
  } catch (error) {
    return null;
  }
}

function managedSignupIcon(id) {
  const template = document.querySelector(`#${id}`);
  return template ? template.content.firstElementChild.cloneNode(true) : document.createElement('span');
}

function managedSignupBadgeClass(value = '') {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (normalized === 'long-term') return 'badge-long-term';
  if (normalized === 'ad-hoc') return 'badge-ad-hoc';
  return 'badge-open';
}

function managedSignupTypeLabel(type = '') {
  return type === 'long-term' ? 'Long-term' : 'Ad-hoc';
}

function managedOpenYmHubSignup() {
  const target = window.open(MANAGED_YM_HUB_SIGNUP_URL, '_blank', 'noopener');
  if (target) target.opener = null;
}

function managedSignupOpenOpportunityModal(id) {
  const opp = managedSignupOpportunity(id);
  const modal = document.querySelector('#modal');
  const layer = document.querySelector('#modal-layer');
  if (!opp || !modal || !layer) return;

  const actions = [
    managedSignupMake('button', {
      type: 'button',
      class: 'button button-primary',
      text: 'Sign up on YM-Hub',
      dataset: { ymhubSignup: String(id) }
    }),
    managedSignupMake('button', {
      type: 'button',
      class: 'button',
      text: 'Close',
      dataset: { closeModal: 'true' }
    })
  ];

  modal.replaceChildren(
    managedSignupMake('div', { class: 'modal-hero' }, [
      managedSignupMake('button', { type: 'button', class: 'close-button', 'aria-label': 'Close dialog', text: '×', dataset: { closeModal: 'true' } }),
      managedSignupMake('div', { class: 'hero-orb hero-orb-one' }),
      managedSignupMake('span', { class: `badge ${managedSignupBadgeClass(opp.type)}`, text: managedSignupTypeLabel(opp.type) }),
      managedSignupMake('h2', { id: 'modal-title', text: opp.title })
    ]),
    managedSignupMake('div', { class: 'modal-body' }, [
      managedSignupMake('div', { class: 'modal-meta' }, [
        managedSignupMake('span', { class: 'modal-chip' }, [managedSignupIcon('icon-clock'), document.createTextNode(opp.time || '')]),
        managedSignupMake('span', { class: 'modal-chip' }, [managedSignupIcon('icon-location'), document.createTextNode(opp.location || '')]),
        managedSignupMake('span', { class: 'modal-chip' }, [managedSignupIcon('icon-calendar'), document.createTextNode(opp.commitment || '')])
      ]),
      managedSignupMake('section', { class: 'modal-section' }, [
        managedSignupMake('h3', { text: 'About this role' }),
        managedSignupMake('p', { text: opp.description })
      ]),
      managedSignupMake('section', { class: 'modal-section' }, [
        managedSignupMake('h3', { text: 'Requirements' }),
        managedSignupMake('p', { text: opp.requirements })
      ])
    ]),
    managedSignupMake('div', { class: 'modal-actions' }, actions)
  );

  layer.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.focus({ preventScroll: true }));
}

document.addEventListener('click', event => {
  const signupButton = event.target.closest('[data-signup-opportunity], [data-ymhub-signup]');
  if (!signupButton) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  managedOpenYmHubSignup();
}, true);

document.addEventListener('click', event => {
  const oppCard = event.target.closest('[data-opp-id]');
  if (!oppCard) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  managedSignupOpenOpportunityModal(oppCard.dataset.oppId);
}, true);
