state.opportunityIndex = 0;

function opportunityPhotoNode(opp, className = 'opp-photo-wrap') {
  const alt = opp.photoAlt || `${opp.title} volunteer opportunity photo`;
  if (opp.photo) {
    return make('figure', { class: className }, [
      make('img', { src: opp.photo, alt, loading: 'lazy' })
    ]);
  }

  return make('div', { class: `${className} opp-photo-fallback`, 'aria-label': 'Photo placeholder' }, [
    make('span', { text: 'M' }),
    make('p', { text: 'Add this opportunity photo in the CMS' })
  ]);
}

function createOpportunityCard(opp, index, total) {
  return make('article', {
    class: 'opp-swipe-card',
    dataset: { swipeCard: 'true' },
    'aria-label': `${opp.title}, card ${index + 1} of ${total}`
  }, [
    opportunityPhotoNode(opp),
    make('div', { class: 'opp-swipe-content' }, [
      make('div', { class: 'opp-swipe-kicker' }, [
        make('span', { class: `badge ${badgeClass(opp.type)}`, text: typeLabel(opp.type) }),
        opp.status ? make('span', { class: `badge ${badgeClass(opp.status)}`, text: opp.status }) : null
      ]),
      make('h2', { text: opp.title }),
      make('p', { class: 'opp-swipe-description', text: opp.description }),
      make('div', { class: 'opp-meta opp-swipe-meta' }, [
        make('span', {}, [iconFromTemplate('icon-clock'), document.createTextNode(opp.time || '')]),
        make('span', {}, [iconFromTemplate('icon-location'), document.createTextNode(opp.location || '')]),
        make('span', {}, [iconFromTemplate('icon-calendar'), document.createTextNode(opp.commitment || '')])
      ]),
      make('div', { class: 'opp-swipe-actions' }, [
        make('button', { type: 'button', class: 'button button-primary', text: 'View details', dataset: { oppId: String(opp.id) } }),
        make('a', {
          class: 'button button-ghost',
          href: state.data.site.registrationUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          text: 'Register interest'
        })
      ])
    ])
  ]);
}

function renderHomeOpportunities() {
  const container = qs('#home-opportunities');
  clear(container);
  state.data.opportunities.slice(0, 4).forEach(opp => {
    const card = make('button', {
      type: 'button',
      class: 'mini-card',
      dataset: { oppId: String(opp.id) }
    }, [
      opp.photo ? make('img', {
        class: 'mini-card-photo',
        src: opp.photo,
        alt: opp.photoAlt || `${opp.title} volunteer opportunity photo`,
        loading: 'lazy'
      }) : null,
      make('span', { class: `badge ${badgeClass(opp.type)}`, text: typeLabel(opp.type) }),
      make('h3', { text: opp.title }),
      make('p', { text: opp.time })
    ]);
    container.append(card);
  });
}

function opportunityCards() {
  return qsa('[data-swipe-card]', qs('.opportunity-swipe-deck'));
}

function updateOpportunitySwipeStatus() {
  const deck = qs('.opportunity-swipe-deck');
  const status = qs('#opportunity-swipe-count');
  const cards = opportunityCards();
  if (!deck || !status || !cards.length) {
    if (status) status.textContent = '0 of 0';
    qsa('[data-opp-swipe]').forEach(button => { button.disabled = true; });
    state.opportunityIndex = 0;
    return;
  }

  let closestIndex = 0;
  let closestDistance = Infinity;
  cards.forEach((card, index) => {
    const distance = Math.abs(card.offsetLeft - deck.scrollLeft);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  state.opportunityIndex = closestIndex;
  status.textContent = `${closestIndex + 1} of ${cards.length}`;
  qsa('[data-opp-swipe="prev"]').forEach(button => { button.disabled = closestIndex === 0; });
  qsa('[data-opp-swipe="next"]').forEach(button => { button.disabled = closestIndex === cards.length - 1; });
}

function scrollOpportunityDeck(direction) {
  const cards = opportunityCards();
  if (!cards.length) return;
  const nextIndex = Math.max(0, Math.min(cards.length - 1, state.opportunityIndex + direction));
  cards[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  state.opportunityIndex = nextIndex;
  window.setTimeout(updateOpportunitySwipeStatus, 260);
}

function renderOpportunities() {
  const shell = qs('#opportunities-grid');
  const empty = qs('#opportunities-empty');
  clear(shell);
  shell.className = 'container opportunity-swipe-shell';

  const query = state.oppQuery.trim().toLowerCase();
  const list = state.data.opportunities.filter(opp => {
    const matchesType = state.oppFilter === 'all' || opp.type === state.oppFilter;
    const haystack = [opp.title, opp.description, opp.location, opp.time, opp.commitment, opp.requirements].join(' ').toLowerCase();
    return matchesType && (!query || haystack.includes(query));
  });

  empty.hidden = list.length > 0;
  shell.append(
    make('div', { class: 'swipe-instructions', text: 'Swipe the card deck to compare roles. Photos can be uploaded for each opportunity in the CMS.' }),
    make('div', { class: 'opportunity-swipe-deck', tabindex: '0', 'aria-label': 'Swipe through volunteer opportunities' }, list.map((opp, index) => createOpportunityCard(opp, index, list.length))),
    make('div', { class: 'swipe-footer', 'aria-label': 'Opportunity card navigation' }, [
      make('button', { class: 'swipe-control', type: 'button', 'aria-label': 'Previous opportunity', text: '‹', dataset: { oppSwipe: 'prev' } }),
      make('span', { class: 'swipe-count', id: 'opportunity-swipe-count', 'aria-live': 'polite', text: '0 of 0' }),
      make('button', { class: 'swipe-control', type: 'button', 'aria-label': 'Next opportunity', text: '›', dataset: { oppSwipe: 'next' } })
    ])
  );

  const deck = qs('.opportunity-swipe-deck', shell);
  let swipeTicking = false;
  deck.addEventListener('scroll', () => {
    if (swipeTicking) return;
    swipeTicking = true;
    window.requestAnimationFrame(() => {
      updateOpportunitySwipeStatus();
      swipeTicking = false;
    });
  }, { passive: true });

  state.opportunityIndex = 0;
  deck.scrollTo({ left: 0, behavior: 'auto' });
  updateOpportunitySwipeStatus();
}

function openOpportunityModal(id) {
  const opp = findOpportunity(id);
  if (!opp) return;
  const modal = qs('#modal');
  clear(modal);
  modal.append(
    modalHeader(opp.title, typeLabel(opp.type), badgeClass(opp.type)),
    make('div', { class: 'modal-body' }, [
      opportunityPhotoNode(opp, 'modal-opportunity-photo'),
      make('div', { class: 'modal-meta' }, [
        make('span', { class: 'modal-chip' }, [iconFromTemplate('icon-clock'), document.createTextNode(opp.time || '')]),
        make('span', { class: 'modal-chip' }, [iconFromTemplate('icon-location'), document.createTextNode(opp.location || '')]),
        make('span', { class: 'modal-chip' }, [iconFromTemplate('icon-calendar'), document.createTextNode(opp.commitment || '')])
      ]),
      make('section', { class: 'modal-section' }, [make('h3', { text: 'About this role' }), make('p', { text: opp.description })]),
      make('section', { class: 'modal-section' }, [make('h3', { text: 'Requirements' }), make('p', { text: opp.requirements })])
    ]),
    make('div', { class: 'modal-actions' }, [
      make('a', {
        class: 'button button-primary',
        href: state.data.site.registrationUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        text: 'Register now'
      }),
      make('button', { type: 'button', class: 'button', text: 'Close', dataset: { closeModal: 'true' } })
    ])
  );
  openModal();
}

document.addEventListener('click', event => {
  const swipeControl = event.target.closest('[data-opp-swipe]');
  if (!swipeControl) return;
  event.preventDefault();
  scrollOpportunityDeck(swipeControl.dataset.oppSwipe === 'next' ? 1 : -1);
});
