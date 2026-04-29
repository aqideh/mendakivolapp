state.opportunityIndex = 0;
state.oppCategory = 'all';
state.quizAnswers = {};
state.quizResult = null;

const volunteerCategoryMeta = {
  mentor: {
    label: 'Mentor',
    plural: 'Mentoring opportunities',
    headline: 'You are a Mentor',
    description: 'You are strongest when you can guide someone over time, listen to their goals, and help them build confidence one step at a time.',
    button: 'Browse mentoring opportunities'
  },
  facilitator: {
    label: 'Facilitator',
    plural: 'Facilitator opportunities',
    headline: 'You are a Facilitator',
    description: 'You enjoy creating structure, leading group activities, and helping learners or families participate with confidence.',
    button: 'Browse facilitator opportunities'
  },
  befriender: {
    label: 'Befriender',
    plural: 'Befriending opportunities',
    headline: 'You are a Befriender',
    description: 'You are patient, steady, and people-centred. You are well suited to roles that build trust through regular companionship and care.',
    button: 'Browse befriending opportunities'
  },
  'community-volunteering': {
    label: 'Community Volunteer',
    plural: 'Community volunteering opportunities',
    headline: 'You are a Community Volunteer',
    description: 'You prefer practical, high-energy ways to help. You are well suited to ad-hoc opportunities, events, packing days, and community support tasks.',
    button: 'Browse community volunteering opportunities'
  }
};

const quizQuestions = [
  {
    id: 'support-style',
    question: 'How would you most like to support someone?',
    answers: [
      { text: 'Guide them through goals and decisions over time', category: 'mentor' },
      { text: 'Help a group learn or complete an activity', category: 'facilitator' },
      { text: 'Check in, listen, and provide steady companionship', category: 'befriender' },
      { text: 'Pitch in where help is needed at events or projects', category: 'community-volunteering' }
    ]
  },
  {
    id: 'setting',
    question: 'Which setting sounds most natural to you?',
    answers: [
      { text: 'One-to-one conversations with a youth or learner', category: 'mentor' },
      { text: 'Small group activities with children, parents, or participants', category: 'facilitator' },
      { text: 'Quiet visits, calls, or personal check-ins', category: 'befriender' },
      { text: 'Busy event spaces with clear tasks and teamwork', category: 'community-volunteering' }
    ]
  },
  {
    id: 'commitment',
    question: 'What kind of commitment fits you best?',
    answers: [
      { text: 'A structured relationship across a few months', category: 'mentor' },
      { text: 'Regular sessions where I help run activities', category: 'facilitator' },
      { text: 'Flexible but consistent support for someone who may feel isolated', category: 'befriender' },
      { text: 'One-off or short-term opportunities when my schedule allows', category: 'community-volunteering' }
    ]
  },
  {
    id: 'strength',
    question: 'Which strength describes you best?',
    answers: [
      { text: 'Encouraging reflection and growth', category: 'mentor' },
      { text: 'Explaining, organising, and keeping people engaged', category: 'facilitator' },
      { text: 'Empathy, patience, and being present', category: 'befriender' },
      { text: 'Adaptability and getting things done quickly', category: 'community-volunteering' }
    ]
  }
];

function categoryLabel(category = '') {
  return volunteerCategoryMeta[category]?.label || '';
}

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
        opp.category ? make('span', { class: 'badge badge-category', text: categoryLabel(opp.category) }) : null,
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
      opp.category ? make('span', { class: 'badge badge-category', text: categoryLabel(opp.category) }) : null,
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

function matchesOpportunityFilter(opp) {
  if (state.oppFilter === 'all') return true;
  return opp.type === state.oppFilter || opp.category === state.oppFilter;
}

function renderOpportunities() {
  const shell = qs('#opportunities-grid');
  const empty = qs('#opportunities-empty');
  clear(shell);
  shell.className = 'container opportunity-swipe-shell';

  const query = state.oppQuery.trim().toLowerCase();
  const list = state.data.opportunities.filter(opp => {
    const haystack = [opp.title, opp.description, opp.location, opp.time, opp.commitment, opp.requirements, categoryLabel(opp.category)].join(' ').toLowerCase();
    return matchesOpportunityFilter(opp) && (!query || haystack.includes(query));
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
      opp.category ? make('span', { class: 'badge badge-category', text: categoryLabel(opp.category) }) : null,
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

function injectOpportunityCategoryFilters() {
  const filters = qs('#opp-filters');
  if (!filters || filters.dataset.categoriesReady === 'true') return;
  filters.dataset.categoriesReady = 'true';
  const categoryButtons = [
    ['befriender', 'Befrienders'],
    ['mentor', 'Mentors'],
    ['facilitator', 'Facilitators'],
    ['community-volunteering', 'Community volunteering']
  ];
  categoryButtons.forEach(([value, label]) => {
    filters.append(make('button', { class: 'filter', type: 'button', text: label, dataset: { oppFilter: value } }));
  });
}

function injectVolunteerQuizPage() {
  if (qs('#page-quiz')) return;
  const page = make('section', { class: 'page quiz-page', id: 'page-quiz', 'aria-labelledby': 'quiz-title' }, [
    make('div', { class: 'container page-topper quiz-topper' }, [
      make('p', { class: 'eyebrow dark', text: 'Volunteer personality quiz' }),
      make('h1', { id: 'quiz-title', text: 'What kind of volunteer are you?' }),
      make('p', { text: 'Answer four quick questions and get matched to a volunteering personality: mentor, facilitator, befriender, or community volunteer.' })
    ]),
    make('div', { class: 'container quiz-layout' }, [
      make('form', { class: 'quiz-card', id: 'volunteer-quiz-form' }),
      make('aside', { class: 'quiz-result-card', id: 'quiz-result-card', hidden: '' })
    ])
  ]);
  qs('#main-content')?.append(page);
  renderVolunteerQuiz();
}

function injectHomeQuizCta() {
  const heroActions = qs('.hero-actions');
  if (!heroActions || qs('[data-start-quiz]')) return;
  heroActions.append(make('button', {
    class: 'button button-quiz',
    type: 'button',
    text: 'Tap here to find out what kind of volunteer you are!',
    dataset: { pageTarget: 'quiz', startQuiz: 'true' }
  }));
}

function renderVolunteerQuiz() {
  const form = qs('#volunteer-quiz-form');
  if (!form) return;
  clear(form);
  quizQuestions.forEach((item, index) => {
    const fieldset = make('fieldset', { class: 'quiz-question' }, [
      make('legend', {}, [
        make('span', { text: `Question ${index + 1}` }),
        document.createTextNode(item.question)
      ])
    ]);
    item.answers.forEach(answer => {
      const inputId = `quiz-${item.id}-${answer.category}`;
      const radio = make('input', { id: inputId, type: 'radio', name: item.id, value: answer.category, required: '' });
      const label = make('label', { for: inputId, class: 'quiz-option' }, [radio, make('span', { text: answer.text })]);
      fieldset.append(label);
    });
    form.append(fieldset);
  });
  form.append(make('button', { type: 'submit', class: 'button button-primary quiz-submit', text: 'Show my volunteer personality' }));
}

function calculateVolunteerPersonality(form) {
  const scores = { mentor: 0, facilitator: 0, befriender: 0, 'community-volunteering': 0 };
  quizQuestions.forEach(question => {
    const value = new FormData(form).get(question.id);
    if (value && Object.prototype.hasOwnProperty.call(scores, value)) scores[value] += 1;
  });
  const tieBreak = ['mentor', 'facilitator', 'befriender', 'community-volunteering'];
  return tieBreak.sort((a, b) => scores[b] - scores[a])[0];
}

function renderQuizResult(category) {
  const result = qs('#quiz-result-card');
  if (!result) return;
  const meta = volunteerCategoryMeta[category] || volunteerCategoryMeta.mentor;
  result.hidden = false;
  result.replaceChildren(
    make('p', { class: 'eyebrow dark', text: 'Your result' }),
    make('h2', { text: meta.headline }),
    make('p', { text: meta.description }),
    make('button', {
      type: 'button',
      class: 'button button-primary',
      text: meta.button,
      dataset: { browseQuizResult: category }
    }),
    make('button', {
      type: 'button',
      class: 'button button-ghost',
      text: 'Retake quiz',
      dataset: { retakeQuiz: 'true' }
    })
  );
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function browseQuizResult(category) {
  state.oppFilter = category;
  state.oppCategory = category;
  state.oppQuery = '';
  const search = qs('#opp-search');
  if (search) search.value = '';
  qsa('#opp-filters .filter').forEach(button => button.classList.toggle('active', button.dataset.oppFilter === category));
  renderOpportunities();
  window.switchPage('opportunities');
}

const originalSwitchPage = window.switchPage;
window.switchPage = function enhancedSwitchPage(page, updateHash = true) {
  if (page === 'quiz') {
    state.page = 'quiz';
    injectVolunteerQuizPage();
    qsa('.page').forEach(section => section.classList.toggle('active', section.id === 'page-quiz'));
    qsa('[data-page-target]').forEach(button => {
      const active = button.dataset.pageTarget === 'quiz';
      button.classList.toggle('active', active);
      if (button.classList.contains('nav-link') || button.classList.contains('mobile-tab')) {
        button.setAttribute('aria-current', active ? 'page' : 'false');
      }
    });
    closeModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (updateHash && window.location.hash.replace('#', '') !== 'quiz') history.pushState(null, '', '#quiz');
    return;
  }
  originalSwitchPage(page, updateHash);
};

window.addEventListener('hashchange', () => {
  if (window.location.hash.replace('#', '') === 'quiz') window.switchPage('quiz', false);
});

document.addEventListener('click', event => {
  const swipeControl = event.target.closest('[data-opp-swipe]');
  if (swipeControl) {
    event.preventDefault();
    scrollOpportunityDeck(swipeControl.dataset.oppSwipe === 'next' ? 1 : -1);
    return;
  }

  const browseButton = event.target.closest('[data-browse-quiz-result]');
  if (browseButton) {
    browseQuizResult(browseButton.dataset.browseQuizResult);
    return;
  }

  const retakeButton = event.target.closest('[data-retake-quiz]');
  if (retakeButton) {
    qs('#volunteer-quiz-form')?.reset();
    const result = qs('#quiz-result-card');
    if (result) result.hidden = true;
  }
});

document.addEventListener('submit', event => {
  if (event.target?.id !== 'volunteer-quiz-form') return;
  event.preventDefault();
  const category = calculateVolunteerPersonality(event.target);
  state.quizResult = category;
  renderQuizResult(category);
});

document.addEventListener('DOMContentLoaded', () => {
  injectOpportunityCategoryFilters();
  injectVolunteerQuizPage();
  injectHomeQuizCta();
});
