const quizFlowQuestions = [
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

const quizFlowMeta = {
  mentor: {
    label: 'Mentor',
    headline: 'You are a Mentor',
    description: 'You are strongest when you can guide someone over time, listen to their goals, and help them build confidence one step at a time.',
    button: 'Browse mentoring opportunities'
  },
  facilitator: {
    label: 'Facilitator',
    headline: 'You are a Facilitator',
    description: 'You enjoy creating structure, leading group activities, and helping learners or families participate with confidence.',
    button: 'Browse facilitator opportunities'
  },
  befriender: {
    label: 'Befriender',
    headline: 'You are a Befriender',
    description: 'You are patient, steady, and people-centred. You are well suited to roles that build trust through regular companionship and care.',
    button: 'Browse befriending opportunities'
  },
  'community-volunteering': {
    label: 'Community Volunteer',
    headline: 'You are a Community Volunteer',
    description: 'You prefer practical, high-energy ways to help. You are well suited to ad-hoc opportunities, events, packing days, and community support tasks.',
    button: 'Browse community volunteering opportunities'
  }
};

function removeHeroQuizButton() {
  document.querySelectorAll('.hero-actions [data-start-quiz], .hero-actions [data-page-target="quiz"]').forEach(button => button.remove());
}

function addQuizFlowStyles() {
  if (document.querySelector('#quiz-flow-styles')) return;
  const style = document.createElement('style');
  style.id = 'quiz-flow-styles';
  style.textContent = `
    .quiz-page.quiz-results-active .quiz-topper { display: none; }
    .quiz-layout.quiz-flow-layout { grid-template-columns: 1fr; max-width: 880px; }
    .quiz-card.quiz-single-card {
      min-height: min(560px, calc(100dvh - 190px));
      display: grid;
      align-content: center;
      gap: 1rem;
      overflow: hidden;
    }
    .quiz-card.quiz-single-card[hidden] { display: none; }
    .quiz-progress {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      color: var(--text-3);
      font-size: 0.78rem;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .quiz-progress-bar {
      flex: 1;
      height: 9px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(55, 58, 54, 0.09);
    }
    .quiz-progress-fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--yellow);
      transition: width 0.22s ease;
    }
    .quiz-single-card h2 {
      max-width: 760px;
      margin: 0;
      color: var(--black);
      font-size: clamp(2.2rem, 6vw, 4.9rem);
      line-height: 0.96;
      letter-spacing: -0.06em;
    }
    .quiz-answer-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
      margin-top: 0.75rem;
    }
    .quiz-option-button {
      min-height: 112px;
      border: 1px solid var(--line);
      border-radius: 20px;
      background: #fff;
      color: var(--text-2);
      padding: 1rem;
      text-align: left;
      font-weight: 800;
      line-height: 1.45;
      transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease;
    }
    .quiz-option-button:hover,
    .quiz-option-button.selected {
      transform: translateY(-2px);
      border-color: rgba(201, 168, 0, 0.5);
      background: var(--yellow-light);
      color: var(--black);
    }
    .quiz-splash-card {
      position: relative;
      min-height: min(720px, calc(100dvh - 125px));
      display: grid;
      place-items: center;
      overflow: hidden;
      text-align: center;
      background:
        radial-gradient(circle at top left, rgba(255, 215, 0, 0.24), transparent 22rem),
        radial-gradient(circle at bottom right, rgba(38, 181, 198, 0.16), transparent 22rem),
        var(--black);
      color: #fff;
    }
    .quiz-splash-card[hidden] { display: none; }
    .quiz-splash-inner {
      position: relative;
      z-index: 1;
      display: grid;
      justify-items: center;
      gap: 1rem;
      max-width: 780px;
      padding: clamp(1.25rem, 5vw, 3rem);
    }
    .quiz-splash-card .eyebrow { margin: 0; }
    .quiz-splash-card h2 {
      margin: 0;
      font-size: clamp(3rem, 10vw, 7rem);
      line-height: 0.9;
      letter-spacing: -0.075em;
      color: #fff;
    }
    .quiz-splash-card p:not(.eyebrow) {
      max-width: 660px;
      margin: 0;
      color: rgba(255, 255, 255, 0.72);
      font-size: clamp(1rem, 2vw, 1.22rem);
      line-height: 1.7;
    }
    .quiz-splash-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .quiz-splash-actions .button-ghost {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border-color: rgba(255, 255, 255, 0.2);
    }
    @media (max-width: 760px) {
      .quiz-answer-grid { grid-template-columns: 1fr; }
      .quiz-card.quiz-single-card { min-height: calc(100dvh - 160px); }
      .quiz-option-button { min-height: 88px; }
      .quiz-splash-actions .button { width: 100%; }
    }
  `;
  document.head.append(style);
}

function makeQuizNode(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'text') node.textContent = value;
    else if (key === 'hidden') node.hidden = Boolean(value);
    else node.setAttribute(key, value);
  });
  children.filter(Boolean).forEach(child => node.append(child));
  return node;
}

function clearQuizNode(node) {
  if (node) node.replaceChildren();
}

function quizPage() {
  return document.querySelector('#page-quiz');
}

function quizForm() {
  return document.querySelector('#volunteer-quiz-form');
}

function quizResultCard() {
  return document.querySelector('#quiz-result-card');
}

function prepareQuizLayout() {
  addQuizFlowStyles();
  removeHeroQuizButton();
  const page = quizPage();
  const form = quizForm();
  const result = quizResultCard();
  const layout = document.querySelector('#page-quiz .quiz-layout');
  if (page) page.classList.remove('quiz-results-active');
  if (layout) layout.classList.add('quiz-flow-layout');
  if (form) {
    form.hidden = false;
    form.className = 'quiz-card quiz-single-card';
  }
  if (result) {
    result.hidden = true;
    result.className = 'quiz-result-card';
  }
  const topper = document.querySelector('#page-quiz .quiz-topper');
  if (topper) topper.hidden = false;
}

function startQuizFlow() {
  state.quizStep = 0;
  state.quizAnswers = {};
  state.quizResult = null;
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const form = quizForm();
  if (!form) return;
  prepareQuizLayout();
  clearQuizNode(form);

  const index = Math.max(0, Math.min(Number(state.quizStep || 0), quizFlowQuestions.length - 1));
  state.quizStep = index;
  const item = quizFlowQuestions[index];
  const progress = Math.round(((index + 1) / quizFlowQuestions.length) * 100);

  form.append(
    makeQuizNode('div', { class: 'quiz-progress', 'aria-label': `Question ${index + 1} of ${quizFlowQuestions.length}` }, [
      makeQuizNode('span', { text: `Question ${index + 1} of ${quizFlowQuestions.length}` }),
      makeQuizNode('span', { class: 'quiz-progress-bar', 'aria-hidden': 'true' }, [
        makeQuizNode('span', { class: 'quiz-progress-fill', style: `width: ${progress}%` })
      ])
    ]),
    makeQuizNode('h2', { text: item.question }),
    makeQuizNode('div', { class: 'quiz-answer-grid' }, item.answers.map(answer => makeQuizNode('button', {
      type: 'button',
      class: 'quiz-option-button',
      text: answer.text,
      dataset: { quizAnswer: answer.category }
    })))
  );
}

function chooseQuizAnswer(category, button) {
  const item = quizFlowQuestions[Number(state.quizStep || 0)];
  if (!item) return;
  state.quizAnswers = { ...(state.quizAnswers || {}), [item.id]: category };
  document.querySelectorAll('[data-quiz-answer]').forEach(option => { option.disabled = true; });
  if (button) button.classList.add('selected');

  window.setTimeout(() => {
    if (Number(state.quizStep || 0) >= quizFlowQuestions.length - 1) {
      const result = calculateQuizResult();
      state.quizResult = result;
      renderQuizSplash(result);
      return;
    }
    state.quizStep = Number(state.quizStep || 0) + 1;
    renderQuizQuestion();
  }, 240);
}

function calculateQuizResult() {
  const scores = { mentor: 0, facilitator: 0, befriender: 0, 'community-volunteering': 0 };
  Object.values(state.quizAnswers || {}).forEach(category => {
    if (Object.prototype.hasOwnProperty.call(scores, category)) scores[category] += 1;
  });
  return ['mentor', 'facilitator', 'befriender', 'community-volunteering']
    .sort((a, b) => scores[b] - scores[a])[0];
}

function renderQuizSplash(category) {
  const page = quizPage();
  const form = quizForm();
  const result = quizResultCard();
  const layout = document.querySelector('#page-quiz .quiz-layout');
  if (!result) return;
  const meta = quizFlowMeta[category] || quizFlowMeta.mentor;
  if (page) page.classList.add('quiz-results-active');
  if (layout) layout.classList.add('quiz-flow-layout');
  if (form) form.hidden = true;
  result.hidden = false;
  result.className = 'quiz-result-card quiz-splash-card';
  result.replaceChildren(
    makeQuizNode('div', { class: 'quiz-splash-inner' }, [
      makeQuizNode('p', { class: 'eyebrow', text: 'Your result' }),
      makeQuizNode('h2', { text: meta.headline }),
      makeQuizNode('p', { text: meta.description }),
      makeQuizNode('div', { class: 'quiz-splash-actions' }, [
        makeQuizNode('button', {
          type: 'button',
          class: 'button button-primary',
          text: meta.button,
          dataset: { browseQuizResult: category }
        }),
        makeQuizNode('button', {
          type: 'button',
          class: 'button button-ghost',
          text: 'Retake quiz',
          dataset: { retakeQuiz: 'true' }
        })
      ])
    ])
  );
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function browseQuizCategory(category) {
  state.oppFilter = category;
  state.oppCategory = category;
  state.oppQuery = '';
  const search = document.querySelector('#opp-search');
  if (search) search.value = '';
  document.querySelectorAll('#opp-filters .filter').forEach(button => {
    button.classList.toggle('active', button.dataset.oppFilter === category);
  });
  if (typeof renderOpportunities === 'function') renderOpportunities();
  if (typeof window.switchPage === 'function') window.switchPage('opportunities');
}

try {
  window.renderVolunteerQuiz = renderQuizQuestion;
  renderVolunteerQuiz = renderQuizQuestion;
  window.renderQuizResult = renderQuizSplash;
  renderQuizResult = renderQuizSplash;
} catch (error) {
  window.renderVolunteerQuiz = renderQuizQuestion;
  window.renderQuizResult = renderQuizSplash;
}

document.addEventListener('click', event => {
  const answer = event.target.closest('[data-quiz-answer]');
  if (answer) {
    event.preventDefault();
    event.stopImmediatePropagation();
    chooseQuizAnswer(answer.dataset.quizAnswer, answer);
    return;
  }

  const retakeButton = event.target.closest('[data-retake-quiz]');
  if (retakeButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    startQuizFlow();
    return;
  }

  const browseButton = event.target.closest('[data-browse-quiz-result]');
  if (browseButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    browseQuizCategory(browseButton.dataset.browseQuizResult);
    return;
  }

  const quizTrigger = event.target.closest('[data-start-quiz], [data-page-target="quiz"]');
  if (!quizTrigger) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  removeHeroQuizButton();
  if (typeof window.switchPage === 'function') {
    window.switchPage('quiz');
    startQuizFlow();
  }
}, true);

document.addEventListener('DOMContentLoaded', () => {
  addQuizFlowStyles();
  removeHeroQuizButton();
  window.setTimeout(() => {
    removeHeroQuizButton();
    if (window.location.hash.replace('#', '') === 'quiz') startQuizFlow();
    else if (quizForm()) renderQuizQuestion();
  }, 0);
});
