(() => {
  if (window.__phaseThirtyFourAdminShellInstalled) return;
  window.__phaseThirtyFourAdminShellInstalled = true;

  const AREAS = [
    ['home', 'Home'],
    ['content', 'Content'],
    ['opportunities', 'Opportunities'],
    ['signups', 'Sign-ups'],
    ['attendance', 'Attendance'],
    ['training', 'Training'],
    ['referrals', 'Referrals'],
    ['points', 'Points'],
    ['reports', 'Reports'],
    ['audit', 'Audit'],
    ['notifications', 'Notifications'],
    ['system', 'System / QA']
  ];

  const AREA_COPY = {
    home: ['Admin home', 'Prioritise urgent work queues and jump into focused admin pages.'],
    content: ['Content', 'Manage public site content and static app copy.'],
    opportunities: ['Opportunities', 'Manage opportunity parent listings, sessions, capacity, and codes.'],
    signups: ['Sign-ups', 'Review opportunity sign-ups and waitlist flows.'],
    attendance: ['Attendance', 'Review attendance claims and session code operations.'],
    training: ['Training', 'Manage training programmes, sessions, sign-ups, and completion.'],
    referrals: ['Referrals', 'Track referral codes, acceptances, and referral operations.'],
    points: ['Points', 'Review points, achievements, and award operations.'],
    reports: ['Reports', 'Run admin reports and export CSV files.'],
    audit: ['Audit', 'Inspect audit history and operational changes.'],
    notifications: ['Notifications', 'Review notifications, preferences, and history.'],
    system: ['System / QA', 'Run smoke checks and review production-readiness tools.']
  };

  const state34 = {
    activeArea: 'home',
    open: false
  };

  function store() { return window.VolunteerDataStore; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function layout() { return document.querySelector('.dashboard-layout'); }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }
  function signups() { return store()?.getOpportunitySignups?.() || []; }
  function attendanceClaims() { return store()?.getAttendanceClaims?.() || []; }
  function trainingSignups() { return store()?.getTrainingSignups?.() || []; }

  function countStatus(items, statuses) {
    const set = new Set(statuses);
    return items.filter(item => set.has(String(item.status || item.claimStatus || ''))).length;
  }

  function getAreaForLegacyCard(card) {
    if (!card || card.dataset.phase34Entry === 'true' || card.dataset.phase34Shell === 'true') return '';
    if (card.matches('[data-admin-content-card]')) return 'content';
    if (card.matches('.admin-attendance-card')) return 'attendance';
    if (card.matches('.admin-training-card, [data-phase31-training-manager]')) return 'training';
    if (card.matches('[data-reports-card]')) return 'reports';
    if (card.matches('[data-audit-history-card], .audit-history-card')) return 'audit';
    if (card.matches('[data-admin-referrals-card], .admin-referrals-card')) return 'referrals';
    if (card.matches('[data-admin-points-card], .admin-points-card')) return 'points';
    if (card.matches('[data-notification-history-card], .notification-history-card, [data-notification-settings-card]')) return 'notifications';
    if (card.matches('[data-phase32-qa-card]')) return 'system';
    if (card.matches('[data-signup-dashboard-card="admin"], .admin-signup-card')) return 'signups';
    if (card.matches('[data-phase31-admin-hub]')) return 'system';
    if (card.dataset.adminUxArea === 'content') return 'content';
    if (card.dataset.adminUxArea === 'training') return 'training';
    if (card.dataset.adminUxArea === 'audit') return card.matches('[data-phase32-qa-card]') ? 'system' : 'audit';
    if (card.dataset.adminUxArea) return card.dataset.adminUxArea;
    if (card.dataset.dashboardCardRole === 'admin') return 'content';
    return '';
  }

  function ensureEntry() {
    if (!isAdmin()) return null;
    let entry = document.querySelector('[data-phase34-entry]');
    if (entry) return entry;
    entry = document.createElement('section');
    entry.className = 'dashboard-card phase34-admin-entry';
    entry.dataset.phase34Entry = 'true';
    entry.innerHTML = entryMarkup();
    const firstAdmin = document.querySelector('[data-phase31-admin-hub], [data-admin-content-card], .admin-attendance-card, .admin-training-card');
    if (firstAdmin) firstAdmin.insertAdjacentElement('beforebegin', entry);
    else layout()?.append(entry);
    return entry;
  }

  function entryMarkup() {
    const pendingSignups = countStatus(signups(), ['pending_review', 'waitlisted']);
    const attendanceQueue = countStatus(attendanceClaims(), ['checked_in', 'submitted', 'clarification_requested']);
    const trainingQueue = countStatus(trainingSignups(), ['registered', 'waitlisted']);
    return `
      <div class="section-header">
        <div>
          <p class="eyebrow dark">Admin</p>
          <h2>Admin workspace</h2>
          <p class="dashboard-muted">Open the single admin interface for content, queues, reports, audit, and system checks.</p>
        </div>
        <button class="button button-primary" type="button" data-phase34-open-admin>Open admin workspace</button>
      </div>
      <div class="phase34-admin-entry-grid">
        <div class="phase34-admin-entry-tile"><strong>${pendingSignups}</strong><span>Pending / waitlisted sign-ups</span></div>
        <div class="phase34-admin-entry-tile"><strong>${attendanceQueue}</strong><span>Attendance queue</span></div>
        <div class="phase34-admin-entry-tile"><strong>${trainingQueue}</strong><span>Training queue</span></div>
      </div>
    `;
  }

  function ensureShell() {
    if (!isAdmin()) return null;
    let shell = document.querySelector('[data-phase34-shell]');
    if (shell) return shell;
    shell = document.createElement('section');
    shell.className = 'phase34-admin-shell';
    shell.dataset.phase34Shell = 'true';
    shell.hidden = !state34.open;
    shell.innerHTML = shellMarkup();
    const entry = ensureEntry();
    if (entry) entry.insertAdjacentElement('afterend', shell);
    else layout()?.prepend(shell);
    return shell;
  }

  function shellMarkup() {
    const [title, description] = AREA_COPY[state34.activeArea] || AREA_COPY.home;
    return `
      <header class="phase34-admin-header">
        <div>
          <p class="eyebrow dark">Admin workspace</p>
          <h2>Single admin interface</h2>
          <p class="dashboard-muted">One workspace, one page per workflow. Legacy tools remain available only as fallback sections while canonical pages are built.</p>
        </div>
        <button class="button dashboard-secondary" type="button" data-phase34-close-admin>Back to dashboard</button>
      </header>
      <div class="phase34-admin-body">
        <nav class="phase34-admin-nav" aria-label="Admin workspace navigation">
          ${AREAS.map(([key, label]) => `<button type="button" class="${key === state34.activeArea ? 'active' : ''}" data-phase34-area="${key}"><span>${escapeHtml(label)}</span></button>`).join('')}
        </nav>
        <main class="phase34-admin-page-wrap" data-phase34-page-wrap>
          <div class="phase34-admin-page-head">
            <div>
              <p class="eyebrow dark">${escapeHtml(state34.activeArea)}</p>
              <h3>${escapeHtml(title)}</h3>
              <p class="dashboard-muted">${escapeHtml(description)}</p>
            </div>
          </div>
          <div class="phase34-admin-cards" data-phase34-page-cards></div>
        </main>
      </div>
    `;
  }

  function adminCards() {
    return Array.from(document.querySelectorAll('.dashboard-layout > .dashboard-card, .dashboard-layout > .phase34-admin-shell .dashboard-card'))
      .filter(card => card.dataset.phase34Entry !== 'true' && card.dataset.phase34Shell !== 'true');
  }

  function markAdminCards() {
    adminCards().forEach(card => {
      const area = getAreaForLegacyCard(card);
      if (!area) return;
      card.dataset.adminOwned = 'true';
      card.dataset.phase34Area = area === 'audit' && card.matches('[data-phase32-qa-card]') ? 'system' : area;
    });
  }

  function homeMarkup() {
    const pendingSignups = countStatus(signups(), ['pending_review', 'waitlisted']);
    const attendanceQueue = countStatus(attendanceClaims(), ['checked_in', 'submitted', 'clarification_requested']);
    const trainingQueue = countStatus(trainingSignups(), ['registered', 'waitlisted']);
    return `
      <div class="phase34-admin-home-grid">
        <button class="phase34-admin-home-card" type="button" data-phase34-area="signups"><strong>${pendingSignups}</strong><span>Sign-ups needing review</span></button>
        <button class="phase34-admin-home-card" type="button" data-phase34-area="attendance"><strong>${attendanceQueue}</strong><span>Attendance items</span></button>
        <button class="phase34-admin-home-card" type="button" data-phase34-area="training"><strong>${trainingQueue}</strong><span>Training queue</span></button>
        <button class="phase34-admin-home-card" type="button" data-phase34-area="system"><strong>QA</strong><span>Smoke checks and readiness</span></button>
      </div>
      <div class="phase34-empty">Use the left navigation to open a focused admin workflow. This home page intentionally avoids duplicating forms.</div>
    `;
  }

  function fallbackLegacyMarkup(host, matchingCards) {
    if (!matchingCards.length) {
      host.insertAdjacentHTML('beforeend', `<div class="phase34-empty">No legacy tools have been assigned to ${escapeHtml((AREA_COPY[state34.activeArea] || [state34.activeArea])[0])}.</div>`);
      return;
    }
    const details = document.createElement('details');
    details.className = 'phase35-legacy-tools';
    details.innerHTML = `<summary>Show existing tools (${matchingCards.length})</summary><div class="phase35-legacy-tool-list"></div>`;
    const list = details.querySelector('.phase35-legacy-tool-list');
    matchingCards.forEach(card => {
      card.classList.remove('admin-ux-hidden');
      list.appendChild(card);
    });
    host.appendChild(details);
  }

  function mountArea() {
    const shell = ensureShell();
    if (!shell) return;
    markAdminCards();
    shell.innerHTML = shellMarkup();
    const nextHost = shell.querySelector('[data-phase34-page-cards]');
    if (!nextHost) return;

    const matchingCards = state34.activeArea === 'home'
      ? []
      : adminCards().filter(card => card.dataset.phase34Area === state34.activeArea);

    const canonicalHandled = window.MENDAKIPhase35CanonicalAdminPages?.render?.(state34.activeArea, nextHost, {
      matchingCards,
      fallbackLegacyMarkup,
      homeMarkup,
      openShell,
      escapeHtml
    });

    if (canonicalHandled) return;

    if (state34.activeArea === 'home') {
      nextHost.innerHTML = homeMarkup();
      return;
    }

    fallbackLegacyMarkup(nextHost, matchingCards);
  }

  function openShell(area = state34.activeArea || 'home') {
    if (!isAdmin()) return;
    state34.open = true;
    state34.activeArea = area;
    document.body.classList.add('phase34-admin-shell-active');
    const shell = ensureShell();
    if (shell) shell.hidden = false;
    ensureEntry();
    mountArea();
    shell?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeShell() {
    state34.open = false;
    const shell = ensureShell();
    if (shell) shell.hidden = true;
    document.body.classList.remove('phase34-admin-shell-active');
    ensureEntry()?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function refreshEntry() {
    const entry = ensureEntry();
    if (entry) entry.innerHTML = entryMarkup();
  }

  function install() {
    if (!isAdmin()) return;
    ensureEntry();
    ensureShell();
    markAdminCards();
    refreshEntry();
    if (state34.open) mountArea();
  }

  function bind() {
    if (window.__phaseThirtyFourAdminShellBound) return;
    window.__phaseThirtyFourAdminShellBound = true;
    document.addEventListener('click', event => {
      const open = event.target.closest('[data-phase34-open-admin]');
      if (open) {
        event.preventDefault();
        openShell('home');
        return;
      }
      const close = event.target.closest('[data-phase34-close-admin]');
      if (close) {
        event.preventDefault();
        closeShell();
        return;
      }
      const area = event.target.closest('[data-phase34-area]');
      if (area && isAdmin()) {
        event.preventDefault();
        openShell(area.getAttribute('data-phase34-area') || 'home');
      }
    }, true);
  }

  window.MENDAKIPhase34AdminShell = { install, openShell, closeShell, mountArea };

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    window.setTimeout(install, 1800);
    window.setTimeout(install, 3200);
  });
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', install);
  window.addEventListener('volunteer-signups-synced', install);
  window.addEventListener('volunteer-attendance-synced', install);
  window.addEventListener('volunteer-training-signups-synced', install);
})();
