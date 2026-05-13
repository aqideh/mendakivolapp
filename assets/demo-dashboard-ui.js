(() => {
  if (window.__mendakiDemoDashboardUiInstalled) return;
  window.__mendakiDemoDashboardUiInstalled = true;

  const viewConfig = {
    home: { eyebrow: 'Volunteer account', title: 'Dashboard', copy: 'Overview of your volunteer profile, hours, referrals, and points.' },
    opportunities: { eyebrow: 'Volunteer account', title: 'Opportunities', copy: 'Review active sign-ups and credited volunteering history.' },
    training: { eyebrow: 'Volunteer account', title: 'Training', copy: 'Track training sign-ups and completion status.' },
    attendance: { eyebrow: 'Volunteer account', title: 'Attendance self-reporting', copy: 'Submit attendance for confirmed volunteering opportunities and track admin review.' },
    referrals: { eyebrow: 'Volunteer account', title: 'Referrals', copy: 'Referral code, referral conversions, and referral-based points.' },
    gamification: { eyebrow: 'Volunteer account', title: 'Gamification', copy: 'Points ledger and achievements generated from attendance, training, and referrals.' },
    settings: { eyebrow: 'Volunteer account', title: 'Settings', copy: 'Update profile details and account settings.' },
    admin: { eyebrow: 'Admin workspace', title: 'Admin', copy: 'Review sign-ups, attendance, training, referrals, and QA checks.' }
  };

  function qs(selector, root = document) { return root.querySelector(selector); }
  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function store() { return window.VolunteerDataStore; }
  function session() { return store()?.getSession?.() || null; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function signedIn() { return Boolean(session()?.email); }

  function stat(selector, fallback = '0') { return qs(selector)?.textContent?.trim() || fallback; }
  function countReferrals() { const refs = store()?.getMyReferrals?.() || window.MENDAKIReferrals?.getMyReferrals?.() || []; return Array.isArray(refs) ? refs.length : 0; }
  function pointsSummary() { const pointNode = qs('[data-points-card] .dashboard-stat strong'); const achievementNode = qsa('[data-points-card] .dashboard-stat strong')[1]; return { points: pointNode?.textContent?.trim() || '0', achievements: achievementNode?.textContent?.trim() || '0' }; }
  function ensureRole(card, role) { if (card) card.dataset.dashboardCardRole = role; }

  function applyRoles() {
    ensureRole(qs('[data-referral-card]'), 'referrals');
    ensureRole(qs('[data-points-card]'), 'gamification');
    ensureRole(qs('[data-attendance-card="volunteer"]'), 'attendance');
    ensureRole(qs('[data-signup-dashboard-card="upcoming"]'), 'opportunities');
    ensureRole(qs('[data-signup-dashboard-card="completed"]'), 'opportunities');
    ensureRole(qs('[aria-labelledby="profile-form-title"]'), 'settings');
    ensureRole(qs('[aria-labelledby="roadmap-title"]'), 'settings');
    qsa('[data-admin-referrals-card], [data-admin-points-card], [data-signup-dashboard-card="admin"], .admin-attendance-card, .admin-training-card, [data-admin-qa-card]').forEach(card => ensureRole(card, 'admin'));
  }

  function tile(view, title, copy, value = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dashboard-module-tile';
    button.dataset.dashboardViewTarget = view;
    button.innerHTML = `<span class="dashboard-module-icon" aria-hidden="true">${value || title.slice(0, 1)}</span><span><strong>${title}</strong><span>${copy}</span></span>`;
    return button;
  }

  function ensureHomeShell() {
    let home = qs('[data-dashboard-app-home]');
    const layout = qs('.dashboard-layout');
    if (!home && layout) {
      home = document.createElement('section');
      home.className = 'dashboard-card dashboard-app-home';
      home.dataset.dashboardAppHome = 'true';
      const profileCard = qs('.dashboard-profile-card');
      if (profileCard) profileCard.insertAdjacentElement('afterend', home); else layout.prepend(home);
    }
    if (!home) return null;
    home.innerHTML = `
      <div class="dashboard-hub-header"><div><p class="eyebrow dark">Volunteer modules</p><h2>Choose a dashboard area</h2><p>Use these demo-friendly sections to present volunteering history, attendance, referrals, and gamification.</p></div></div>
      <div class="dashboard-module-grid" data-demo-dashboard-grid></div>`;
    return home;
  }

  function renderTiles() {
    const home = ensureHomeShell();
    const grid = qs('[data-demo-dashboard-grid]', home || document);
    if (!grid) return;
    const points = pointsSummary();
    const tiles = [
      tile('opportunities', 'Opportunities', `${stat('[data-stat-upcoming]')} confirmed · ${stat('[data-stat-completed]')} completed`, 'VO'),
      tile('attendance', 'Attendance', `${stat('[data-stat-hours]')} verified hours`, 'AT'),
      tile('referrals', 'Referrals', `${countReferrals()} referral records`, 'RF'),
      tile('gamification', 'Gamification', `${points.points} points · ${points.achievements} achievements`, 'GM'),
      tile('settings', 'Settings', 'Profile and account actions', 'ST')
    ];
    if (isAdmin()) tiles.push(tile('admin', 'Admin', 'Review queues and QA checks', 'AD'));
    grid.replaceChildren(...tiles);
  }

  function ensureBackControl(topper) {
    let actions = qs('[data-demo-dashboard-actions]', topper);
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'demo-dashboard-actions';
      actions.dataset.demoDashboardActions = 'true';
      topper.append(actions);
    }
    actions.innerHTML = `<button class="button dashboard-secondary demo-dashboard-back" type="button" data-dashboard-view-target="home">Back to dashboard</button>`;
    return actions;
  }

  function setTopper(view) {
    const config = viewConfig[view] || viewConfig.home;
    const topper = qs('#page-dashboard .page-topper');
    if (!topper) return;
    const eyebrow = qs('.eyebrow', topper);
    const title = qs('h1', topper);
    const copy = qs('p:not(.eyebrow)', topper);
    if (eyebrow) eyebrow.textContent = config.eyebrow;
    if (title) title.textContent = config.title;
    if (copy) copy.textContent = config.copy;
    const actions = ensureBackControl(topper);
    actions.hidden = view === 'home';
  }

  function updateVisibility(view = 'home', options = {}) {
    const page = qs('#page-dashboard');
    const layout = qs('.dashboard-layout');
    if (!page || !layout) return;
    const next = viewConfig[view] ? view : 'home';
    if (next === 'admin' && !isAdmin()) return updateVisibility('home', options);
    applyRoles();
    renderTiles();
    page.dataset.demoDashboardView = next;
    layout.dataset.dashboardView = next;
    setTopper(next);
    if (options.updateHash !== false && window.location.hash !== '#dashboard') history.replaceState(null, '', '#dashboard');

    const inHome = next === 'home';
    qsa('[data-dashboard-card-role]').forEach(card => { const role = card.dataset.dashboardCardRole; card.style.display = inHome ? 'none' : (role === next ? 'grid' : 'none'); });
    const profileCard = qs('.dashboard-profile-card');
    const homeCard = qs('[data-dashboard-app-home]');
    if (profileCard) profileCard.style.display = inHome ? 'grid' : 'none';
    if (homeCard) homeCard.style.display = inHome ? 'grid' : 'none';
    qsa('[data-dashboard-view-target]').forEach(button => button.classList.toggle('active', button.dataset.dashboardViewTarget === next));
  }

  function improveProfileSummary() {
    const summary = qs('[data-profile-summary]');
    if (!summary || !signedIn()) return;
    const points = pointsSummary();
    const items = [['Verified hours', stat('[data-stat-hours]', '0')], ['Points', points.points], ['Referrals', String(countReferrals())], ['Achievements', points.achievements]];
    summary.replaceChildren(...items.map(([label, value]) => { const node = document.createElement('div'); node.className = 'profile-pill'; node.innerHTML = `<strong>${value}</strong><span>${label}</span>`; return node; }));
  }

  function install() {
    applyRoles();
    improveProfileSummary();
    updateVisibility(qs('#page-dashboard')?.dataset.demoDashboardView || 'home', { updateHash: false });
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-dashboard-view-target]');
    if (!target) return;
    const view = target.dataset.dashboardViewTarget || 'home';
    if (!viewConfig[view]) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    updateVisibility(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, true);

  window.addEventListener('hashchange', () => {
    if (window.location.hash.replace('#', '') !== 'dashboard') return;
    updateVisibility('home', { updateHash: false });
  });

  ['DOMContentLoaded', 'volunteer-auth-ready', 'volunteer-auth-changed', 'volunteer-signups-synced', 'volunteer-attendance-synced', 'mendaki-referrals-synced'].forEach(eventName => {
    window.addEventListener(eventName, () => window.setTimeout(install, 80));
  });

  document.addEventListener('DOMContentLoaded', () => { window.setTimeout(install, 300); window.setTimeout(install, 1400); });
})();
