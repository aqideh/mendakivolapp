const quizResultIllustrations = {
  mentor: `
    <svg viewBox="0 0 420 300" role="img" aria-labelledby="mentor-illustration-title" xmlns="http://www.w3.org/2000/svg">
      <title id="mentor-illustration-title">A mentor guiding a learner at a desk</title>
      <rect x="30" y="34" width="360" height="232" rx="42" fill="#FFF7DA"/>
      <circle cx="342" cy="72" r="28" fill="#FFD700" opacity="0.75"/>
      <rect x="62" y="192" width="296" height="20" rx="10" fill="#E8EEF8"/>
      <rect x="118" y="102" width="74" height="104" rx="28" fill="#F5A06F"/>
      <circle cx="155" cy="83" r="30" fill="#F5A06F"/>
      <path d="M120 82c8-31 32-46 64-31 15 7 23 20 23 39-21-9-38-10-52-4-13 5-25 4-35-4Z" fill="#17213B"/>
      <path d="M98 194c11-43 31-65 60-65s51 22 67 65" fill="#234A8C"/>
      <rect x="134" y="143" width="56" height="58" rx="14" fill="#FFFFFF" opacity="0.96"/>
      <path d="M148 164h26M148 180h20" stroke="#17213B" stroke-width="6" stroke-linecap="round"/>
      <circle cx="272" cy="90" r="27" fill="#F7B27F"/>
      <path d="M244 91c5-27 26-39 50-26 9 5 15 14 15 25-18-7-32-7-43-2-8 4-15 5-22 3Z" fill="#17213B"/>
      <path d="M225 202c8-45 25-70 51-70 28 0 48 25 60 70" fill="#FFD700"/>
      <rect x="248" y="145" width="66" height="42" rx="13" fill="#FFFFFF"/>
      <path d="M259 165h44" stroke="#17213B" stroke-width="6" stroke-linecap="round"/>
      <path d="M198 145c20-20 39-22 57-6" stroke="#17213B" stroke-width="10" stroke-linecap="round"/>
      <path d="M104 220h224" stroke="#17213B" stroke-width="9" stroke-linecap="round"/>
      <path d="M329 128l10 10 22-27" stroke="#234A8C" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  facilitator: `
    <svg viewBox="0 0 420 300" role="img" aria-labelledby="facilitator-illustration-title" xmlns="http://www.w3.org/2000/svg">
      <title id="facilitator-illustration-title">A facilitator leading a small group activity</title>
      <rect x="30" y="34" width="360" height="232" rx="42" fill="#F4FBF1"/>
      <rect x="80" y="62" width="260" height="118" rx="26" fill="#FFFFFF" stroke="#CFE9C8" stroke-width="6"/>
      <path d="M110 102h82M110 128h54M230 100h76M230 128h46" stroke="#17213B" stroke-width="8" stroke-linecap="round"/>
      <circle cx="210" cy="78" r="17" fill="#FFD700"/>
      <circle cx="210" cy="112" r="32" fill="#F5A06F"/>
      <path d="M176 110c5-31 27-47 58-33 13 6 21 18 21 36-21-8-38-9-51-3-9 4-18 4-28 0Z" fill="#17213B"/>
      <path d="M154 219c13-53 32-79 58-79 27 0 48 26 63 79" fill="#234A8C"/>
      <path d="M139 165c-22-10-43-8-62 9" stroke="#17213B" stroke-width="10" stroke-linecap="round"/>
      <path d="M279 165c22-10 43-8 62 9" stroke="#17213B" stroke-width="10" stroke-linecap="round"/>
      <circle cx="87" cy="207" r="27" fill="#F7B27F"/>
      <path d="M55 250c7-35 18-52 33-52 17 0 30 17 39 52" fill="#FFD700"/>
      <circle cx="333" cy="207" r="27" fill="#F7B27F"/>
      <path d="M292 250c9-35 22-52 39-52 16 0 28 17 35 52" fill="#FFD700"/>
      <path d="M74 262h272" stroke="#17213B" stroke-width="9" stroke-linecap="round"/>
      <rect x="183" y="176" width="58" height="48" rx="14" fill="#FFFFFF"/>
      <path d="M197 194h30M197 208h22" stroke="#17213B" stroke-width="6" stroke-linecap="round"/>
    </svg>
  `,
  befriender: `
    <svg viewBox="0 0 420 300" role="img" aria-labelledby="befriender-illustration-title" xmlns="http://www.w3.org/2000/svg">
      <title id="befriender-illustration-title">A befriender sharing a caring conversation</title>
      <rect x="30" y="34" width="360" height="232" rx="42" fill="#FFF3EC"/>
      <circle cx="83" cy="78" r="18" fill="#FFD700" opacity="0.8"/>
      <circle cx="323" cy="72" r="28" fill="#E8EEF8"/>
      <path d="M190 92c17-29 57-27 72 3 15-30 55-32 72-3 24 41-38 80-72 105-34-25-96-64-72-105Z" fill="#FF7A59" opacity="0.95"/>
      <circle cx="137" cy="126" r="31" fill="#F5A06F"/>
      <path d="M102 124c5-31 27-46 58-33 14 6 21 19 21 36-19-8-35-8-49-2-10 4-20 4-30-1Z" fill="#17213B"/>
      <path d="M82 232c12-57 31-86 58-86s48 29 63 86" fill="#234A8C"/>
      <circle cx="271" cy="132" r="31" fill="#F7B27F"/>
      <path d="M239 130c5-28 26-42 55-29 12 6 20 18 21 34-19-6-35-6-49-1-10 3-19 2-27-4Z" fill="#17213B"/>
      <path d="M213 232c12-56 32-84 60-84 27 0 47 28 60 84" fill="#FFD700"/>
      <path d="M190 176c17 16 36 16 57 0" stroke="#17213B" stroke-width="10" stroke-linecap="round"/>
      <path d="M103 247h214" stroke="#17213B" stroke-width="9" stroke-linecap="round"/>
      <rect x="69" y="66" width="95" height="50" rx="19" fill="#FFFFFF"/>
      <path d="M91 86h50M91 101h32" stroke="#17213B" stroke-width="6" stroke-linecap="round"/>
    </svg>
  `,
  'community-volunteering': `
    <svg viewBox="0 0 420 300" role="img" aria-labelledby="community-volunteer-illustration-title" xmlns="http://www.w3.org/2000/svg">
      <title id="community-volunteer-illustration-title">Community volunteers packing support kits together</title>
      <rect x="30" y="34" width="360" height="232" rx="42" fill="#F5F7FF"/>
      <circle cx="328" cy="72" r="24" fill="#FFD700" opacity="0.75"/>
      <rect x="130" y="154" width="160" height="82" rx="18" fill="#FFFFFF" stroke="#17213B" stroke-width="7"/>
      <path d="M130 177h160" stroke="#17213B" stroke-width="7" stroke-linecap="round"/>
      <path d="M181 199h58M181 216h38" stroke="#234A8C" stroke-width="6" stroke-linecap="round"/>
      <path d="M192 154l18 22 19-22" stroke="#FFD700" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="107" cy="121" r="27" fill="#F5A06F"/>
      <path d="M78 121c5-27 25-40 51-28 11 5 18 16 19 31-18-6-33-6-44 0-9 3-17 3-26-3Z" fill="#17213B"/>
      <path d="M59 219c11-51 27-77 49-77 24 0 41 26 52 77" fill="#FFD700"/>
      <circle cx="313" cy="121" r="27" fill="#F7B27F"/>
      <path d="M283 121c5-27 25-40 51-28 11 5 18 16 19 31-18-6-33-6-44 0-9 3-17 3-26-3Z" fill="#17213B"/>
      <path d="M260 219c12-51 29-77 53-77 22 0 38 26 49 77" fill="#234A8C"/>
      <path d="M151 155c-17-20-34-23-52-8" stroke="#17213B" stroke-width="10" stroke-linecap="round"/>
      <path d="M268 155c17-20 35-23 53-8" stroke="#17213B" stroke-width="10" stroke-linecap="round"/>
      <path d="M75 247h270" stroke="#17213B" stroke-width="9" stroke-linecap="round"/>
      <path d="M210 65l12 24 27 4-20 19 5 27-24-13-24 13 5-27-20-19 27-4 12-24Z" fill="#FFD700"/>
    </svg>
  `
};

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
    button: 'Browse mentoring opportunities',
    illustration: quizResultIllustrations.mentor
  },
  facilitator: {
    label: 'Facilitator',
    headline: 'You are a Facilitator',
    description: 'You enjoy creating structure, leading group activities, and helping learners or families participate with confidence.',
    button: 'Browse facilitator opportunities',
    illustration: quizResultIllustrations.facilitator
  },
  befriender: {
    label: 'Befriender',
    headline: 'You are a Befriender',
    description: 'You are patient, steady, and people-centred. You are well suited to roles that build trust through regular companionship and care.',
    button: 'Browse befriending opportunities',
    illustration: quizResultIllustrations.befriender
  },
  'community-volunteering': {
    label: 'Community Volunteer',
    headline: 'You are a Community Volunteer',
    description: 'You prefer practical, high-energy ways to help. You are well suited to ad-hoc opportunities, events, packing days, and community support tasks.',
    button: 'Browse community volunteering opportunities',
    illustration: quizResultIllustrations['community-volunteering']
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
    .quiz-layout.quiz-flow-layout { grid-template-columns: 1fr; max-width: 960px; }
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
      min-height: min(760px, calc(100dvh - 125px));
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
      max-width: 820px;
      padding: clamp(1.25rem, 5vw, 3rem);
    }
    .quiz-result-illustration {
      width: min(100%, 420px);
      margin-bottom: 0.25rem;
      padding: clamp(0.45rem, 1.5vw, 0.85rem);
      border-radius: 34px;
      background: rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12), 0 24px 54px rgba(0, 0, 0, 0.22);
    }
    .quiz-result-illustration svg {
      display: block;
      width: 100%;
      height: auto;
      filter: drop-shadow(0 16px 24px rgba(0, 0, 0, 0.18));
    }
    .quiz-splash-card .eyebrow { margin: 0; }
    .quiz-splash-card h2 {
      margin: 0;
      font-size: clamp(2.65rem, 8.4vw, 6.4rem);
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
      .quiz-result-illustration { width: min(100%, 320px); border-radius: 26px; }
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
    else if (key === 'html') node.innerHTML = value;
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
      makeQuizNode('div', { class: 'quiz-result-illustration', html: meta.illustration, 'aria-hidden': 'false' }),
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
