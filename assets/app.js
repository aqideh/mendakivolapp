const state = {
  data: null,
  page: 'home',
  oppFilter: 'all',
  newsFilter: 'all',
  oppQuery: '',
  lastFocus: null
};

const pageNames = ['home', 'opportunities', 'news', 'about'];

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function clear(node) {
  if (node) node.replaceChildren();
}

function make(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else node.setAttribute(key, value);
  });
  children.filter(Boolean).forEach(child => node.append(child));
  return node;
}

function truncate(text = '', length = 130) {
  return text.length > length ? `${text.slice(0, length).trim()}...` : text;
}

function formatDate(dateString, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('en-SG', options).format(date);
}

function formatNewsMeta(item) {
  return [formatDate(item.date), item.readTime].filter(Boolean).join(' · ');
}

function badgeClass(value = '') {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (normalized === 'announcement') return 'badge-announcement';
  if (normalized === 'programme') return 'badge-programme';
  if (normalized === 'volunteer') return 'badge-volunteer';
  if (normalized === 'long-term') return 'badge-long-term';
  if (normalized === 'ad-hoc') return 'badge-ad-hoc';
  return 'badge-open';
}

function typeLabel(type = '') {
  return type === 'long-term' ? 'Long-term' : 'Ad-hoc';
}

function iconFromTemplate(id) {
  const template = qs(`#${id}`);
  return template ? template.content.firstElementChild.cloneNode(true) : document.createElement('span');
}

function chevronIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'm6 9 6 6 6-6');
  svg.append(path);
  return svg;
}

function setText(selector, text) {
  const node = qs(selector);
  if (node) node.textContent = text || '';
}

async function fetchJson(relativePath) {
  const url = new URL(relativePath, window.location.href);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load ${url.pathname}`);
  return response.json();
}

async function loadData() {
  const [siteData, newsData] = await Promise.all([
    fetchJson('content/data.json'),
    fetchJson('content/news.json')
  ]);

  return {
    ...siteData,
    opportunities: Array.isArray(siteData.opportunities) ? siteData.opportunities : [],
    news: Array.isArray(newsData.news) ? newsData.news : []
  };
}

function renderSiteChrome() {
  const { site, about } = state.data;
  document.title = site.title || 'MENDAKI Volunteer Hub';
  setText('[data-site-short-title]', site.shortTitle || 'MENDAKI');
  setText('[data-site-tagline]', site.tagline || 'Volunteer Hub');
  setText('[data-hero-title]', site.heroTitle);
  setText('[data-hero-subtitle]', site.heroSubtitle);
  setText('[data-hero-button]', site.primaryButtonLabel || 'Browse Opportunities');
  setText('[data-about-intro]', about.intro);
  setText('[data-why-volunteer]', about.whyVolunteer);

  const stats = qs('#hero-stats');
  clear(stats);
  (site.stats || []).forEach(item => {
    stats.append(make('div', { class: 'stat-card' }, [
      make('strong', { text: item.value }),
      make('span', { text: item.label })
    ]));
  });
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
      make('span', { class: `badge ${badgeClass(opp.type)}`, text: typeLabel(opp.type) }),
      make('h3', { text: opp.title }),
      make('p', { text: opp.time })
    ]);
    container.append(card);
  });
}

function renderHomeNews() {
  const container = qs('#home-news');
  clear(container);
  const items = [...state.data.news]
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  items.forEach(item => container.append(createNewsCard(item, true)));
}

function createNewsCard(item, compact = false) {
  const chip = make('span', { class: `badge ${badgeClass(item.category)}`, text: item.category });
  const titleTag = compact ? 'h3' : 'h2';
  const card = make('button', {
    type: 'button',
    class: compact ? 'news-card' : 'news-list-card',
    dataset: { newsId: String(item.id) }
  });

  if (compact) {
    card.append(chip, make(titleTag, { text: item.title }), make('div', { class: 'meta', text: formatNewsMeta(item) }));
    return card;
  }

  card.append(
    make('div', { class: 'news-emoji', text: item.emoji || '•' }),
    make('div', {}, [chip, make(titleTag, { text: item.title }), make('div', { class: 'meta', text: formatNewsMeta(item) })])
  );
  return card;
}

function renderNewsList() {
  const container = qs('#news-list');
  clear(container);
  const list = state.newsFilter === 'all'
    ? [...state.data.news]
    : state.data.news.filter(item => item.category === state.newsFilter);
  list.sort((a, b) => new Date(b.date) - new Date(a.date));
  list.forEach(item => container.append(createNewsCard(item, false)));
}

function createOpportunityCard(opp) {
  return make('button', {
    type: 'button',
    class: 'opp-card',
    dataset: { oppId: String(opp.id) }
  }, [
    make('span', { class: `badge ${badgeClass(opp.type)}`, text: typeLabel(opp.type) }),
    make('h2', { text: opp.title }),
    make('p', { text: truncate(opp.description, 150) }),
    make('div', { class: 'opp-meta' }, [
      make('span', {}, [iconFromTemplate('icon-clock'), document.createTextNode(opp.time || '')]),
      make('span', {}, [iconFromTemplate('icon-location'), document.createTextNode(opp.location || '')])
    ])
  ]);
}

function renderOpportunities() {
  const grid = qs('#opportunities-grid');
  const empty = qs('#opportunities-empty');
  clear(grid);
  const query = state.oppQuery.trim().toLowerCase();
  const list = state.data.opportunities.filter(opp => {
    const matchesType = state.oppFilter === 'all' || opp.type === state.oppFilter;
    const haystack = [opp.title, opp.description, opp.location, opp.time, opp.commitment, opp.requirements].join(' ').toLowerCase();
    return matchesType && (!query || haystack.includes(query));
  });

  empty.hidden = list.length > 0;
  list.forEach(opp => grid.append(createOpportunityCard(opp)));
}

function renderAbout() {
  const { site, about } = state.data;
  const pillars = qs('#pillar-grid');
  clear(pillars);
  (about.pillars || []).forEach(pillar => {
    pillars.append(make('div', { class: 'pillar-tile' }, [
      make('span', { text: pillar.icon || '•' }),
      make('strong', { text: pillar.name })
    ]));
  });

  const contacts = [
    ['Email', site.contact?.email, '@'],
    ['Phone', site.contact?.phone, '☎'],
    ['Address', site.contact?.address, '⌂'],
    ['Office Hours', site.contact?.hours, '◷']
  ].filter(([, value]) => Boolean(value));

  const contactList = qs('#contact-list');
  clear(contactList);
  contacts.forEach(([label, value, icon]) => {
    contactList.append(make('div', { class: 'contact-item' }, [
      make('div', { class: 'contact-icon', text: icon }),
      make('div', {}, [make('span', { text: label }), make('strong', { text: value })])
    ]));
  });

  const faqList = qs('#faq-list');
  clear(faqList);
  (about.faq || []).forEach((item, index) => {
    const answerId = `faq-answer-${index}`;
    const faqItem = make('div', { class: 'faq-item' }, [
      make('button', {
        type: 'button',
        class: 'faq-question',
        'aria-expanded': 'false',
        'aria-controls': answerId
      }, [
        document.createTextNode(item.question),
        chevronIcon()
      ]),
      make('div', { id: answerId, class: 'faq-answer', hidden: '' }, [document.createTextNode(item.answer)])
    ]);
    faqList.append(faqItem);
  });
}

function renderEverything() {
  renderSiteChrome();
  renderHomeOpportunities();
  renderHomeNews();
  renderOpportunities();
  renderNewsList();
  renderAbout();
}

function setActiveControls(page) {
  qsa('[data-page-target]').forEach(button => {
    const active = button.dataset.pageTarget === page;
    button.classList.toggle('active', active);
    if (button.classList.contains('nav-link') || button.classList.contains('mobile-tab')) {
      button.setAttribute('aria-current', active ? 'page' : 'false');
    }
  });
}

function switchPage(page, updateHash = true) {
  if (!pageNames.includes(page)) page = 'home';
  state.page = page;
  qsa('.page').forEach(section => section.classList.toggle('active', section.id === `page-${page}`));
  setActiveControls(page);
  closeModal(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (updateHash && window.location.hash.replace('#', '') !== page) {
    history.pushState(null, '', `#${page}`);
  }
}

function findOpportunity(id) {
  return state.data.opportunities.find(item => Number(item.id) === Number(id));
}

function findNews(id) {
  const targetId = String(id);
  return state.data.news.find(item => String(item.id) === targetId);
}

function modalHeader(title, badgeText, badgeStyleClass) {
  return make('div', { class: 'modal-hero' }, [
    make('button', { type: 'button', class: 'close-button', 'aria-label': 'Close dialog', text: '×', dataset: { closeModal: 'true' } }),
    make('div', { class: 'hero-orb hero-orb-one' }),
    make('span', { class: `badge ${badgeStyleClass}`, text: badgeText }),
    make('h2', { id: 'modal-title', text: title })
  ]);
}

function openOpportunityModal(id) {
  const opp = findOpportunity(id);
  if (!opp) return;
  const modal = qs('#modal');
  clear(modal);
  modal.append(
    modalHeader(opp.title, typeLabel(opp.type), badgeClass(opp.type)),
    make('div', { class: 'modal-body' }, [
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

function openNewsModal(id) {
  const item = findNews(id);
  if (!item) return;
  const modal = qs('#modal');
  clear(modal);
  modal.append(
    modalHeader(item.title, item.category, badgeClass(item.category)),
    make('div', { class: 'modal-body' }, [
      make('div', { class: 'meta', text: formatNewsMeta(item) }),
      make('section', { class: 'modal-section', style: 'margin-top: 1rem;' }, (item.body || []).map(paragraph => make('p', { text: paragraph })))
    ])
  );
  openModal();
}

function openModal() {
  const layer = qs('#modal-layer');
  const modal = qs('#modal');
  state.lastFocus = document.activeElement;
  layer.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.focus({ preventScroll: true }));
}

function closeModal(restoreFocus = true) {
  const layer = qs('#modal-layer');
  if (!layer || layer.hidden) return;
  layer.hidden = true;
  document.body.style.overflow = '';
  clear(qs('#modal'));
  if (restoreFocus && state.lastFocus && typeof state.lastFocus.focus === 'function') {
    state.lastFocus.focus({ preventScroll: true });
  }
}

function setFilterActive(groupSelector, activeButton) {
  qsa(`${groupSelector} .filter`).forEach(button => button.classList.remove('active'));
  activeButton.classList.add('active');
}

function bindEvents() {
  document.addEventListener('click', event => {
    const pageButton = event.target.closest('[data-page-target]');
    if (pageButton) {
      switchPage(pageButton.dataset.pageTarget);
      return;
    }

    const oppFilter = event.target.closest('[data-opp-filter]');
    if (oppFilter) {
      state.oppFilter = oppFilter.dataset.oppFilter;
      setFilterActive('#opp-filters', oppFilter);
      renderOpportunities();
      return;
    }

    const newsFilter = event.target.closest('[data-news-filter]');
    if (newsFilter) {
      state.newsFilter = newsFilter.dataset.newsFilter;
      setFilterActive('#news-filters', newsFilter);
      renderNewsList();
      return;
    }

    const oppCard = event.target.closest('[data-opp-id]');
    if (oppCard) {
      openOpportunityModal(oppCard.dataset.oppId);
      return;
    }

    const newsCard = event.target.closest('[data-news-id]');
    if (newsCard) {
      openNewsModal(newsCard.dataset.newsId);
      return;
    }

    if (event.target.closest('[data-close-modal]')) {
      closeModal();
      return;
    }

    const faqButton = event.target.closest('.faq-question');
    if (faqButton) {
      const item = faqButton.closest('.faq-item');
      const answer = qs(`#${faqButton.getAttribute('aria-controls')}`);
      const open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      faqButton.setAttribute('aria-expanded', String(open));
      if (answer) answer.hidden = !open;
    }
  });

  qs('#opp-search')?.addEventListener('input', event => {
    state.oppQuery = event.target.value || '';
    renderOpportunities();
  });

  window.addEventListener('hashchange', () => switchPage(window.location.hash.replace('#', ''), false));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
  });
}

function showLoadError(error) {
  console.error(error);
  qs('#main-content').innerHTML = `
    <div class="container loading-state">
      <div>
        <h1>Content could not be loaded.</h1>
        <p>Run the site from a local web server or publish it to GitHub Pages. Opening index.html directly as a file can block JSON loading in some browsers.</p>
      </div>
    </div>
  `;
}

async function init() {
  bindEvents();
  try {
    state.data = await loadData();
    renderEverything();
    const initialPage = window.location.hash.replace('#', '') || 'home';
    switchPage(initialPage, false);
  } catch (error) {
    showLoadError(error);
  }
}

document.addEventListener('DOMContentLoaded', init);
