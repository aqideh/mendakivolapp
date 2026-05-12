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
    system: ['System / QA', 'Run smoke checks and review readiness tools.']
  };

  const state34 = { activeArea: 'home', open: false };
  const refreshState34 = { active: new Set(), completed: new Set(), errors: new Map() };

  function store() { return window.VolunteerDataStore; }
  function dataAccess() { return window.MENDAKIDataAccess; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function layout() { return document.querySelector('.dashboard-layout'); }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }
  function signups() { return dataAccess()?.listOpportunitySignups?.() || store()?.getOpportunitySignups?.() || []; }
  function attendanceClaims() { return dataAccess()?.listAttendanceClaims?.() || store()?.getAttendanceClaims?.() || []; }
  function trainingSignups() { return dataAccess()?.listTrainingSignups?.() || store()?.getTrainingSignups?.() || []; }

  function countStatus(items, statuses) {
    const set = new Set(statuses);
    return items.filter(item => set.has(String(item.status || item.claimStatus || ''))).length;
  }

  function adminCounts() {
    return dataAccess()?.adminQueueCounts?.() || {
      pendingSignups: countStatus(signups(), ['pending_review', 'waitlisted']),
      attendanceQueue: countStatus(attendanceClaims(), ['checked_in', 'submitted', 'clarification_requested']),
      trainingQueue: countStatus(trainingSignups(), ['registered', 'waitlisted'])
    };
  }

  function ensureEntry() {
    if (!isAdmin()) return null;
    let entry = document.querySelector('[data-phase34-entry]');
    if (entry) {
      entry.dataset.dashboardCardRole = 'admin';
      return entry;
    }
    entry = document.createElement('section');
    entry.className = 'dashboard-card phase34-admin-entry';
    entry.dataset.phase34Entry = 'true';
    entry.dataset.dashboardCardRole = 'admin';
    entry.innerHTML = entryMarkup();
    layout()?.append(entry);
    return entry;
  }

  function entryMarkup() {
    const counts = adminCounts();
    return `
      <div class="section-header">
        <div>
          <p class="eyebrow dark">Admin</p>
          <h2>Admin workspace</h2>
          <p class="dashboard-muted">Open the admin interface to manage queues, content, reporting, and operations.</p>
        </div>
        <button class="button button-primary" type="button" data-phase34-open-admin>Open admin workspace</button>
      </div>
      <div class="phase34-admin-entry-grid">
        <div class="phase34-admin-entry-tile"><strong>${counts.pendingSignups || 0}</strong><span>Pending / waitlisted sign-ups</span></div>
        <div class="phase34-admin-entry-tile"><strong>${counts.attendanceQueue || 0}</strong><span>Attendance queue</span></div>
        <div class="phase34-admin-entry-tile"><strong>${counts.trainingQueue || 0}</strong><span>Training queue</span></div>
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
    shell.dataset.dashboardCardRole = 'admin';
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
          <h2>Admin interface</h2>
          <p class="dashboard-muted">Use the focused admin pages below to manage operational workflows.</p>
        </div>
        <button class="button dashboard-secondary" type="button" data-phase34-close-admin>Back to dashboard</button>
      </header>
      <div class="phase34-admin-body">
        <nav class="phase34-admin-nav" aria-label="Admin workspace navigation">
          ${AREAS.map(([key, label]) => `<button type="button" class="${key === state34.activeArea ? 'active' : ''}" data-phase34-area="${key}"><span>${escapeHtml(label)}</span></button>`).join('')}
        </nav>
        <main class="phase34-admin-page-wrap" data-phase34-page-wrap data-phase34-active-area="${escapeHtml(state34.activeArea)}">
          <div class="phase34-admin-page-head">
            <div>
              <p class="eyebrow dark">${escapeHtml(state34.activeArea)}</p>
              <h3 data-phase34-page-title>${escapeHtml(title)}</h3>
              <p class="dashboard-muted" data-phase34-page-description>${escapeHtml(description)}</p>
            </div>
          </div>
          <div class="phase34-admin-cards" data-phase34-page-cards></div>
        </main>
      </div>
    `;
  }

  function markHiddenLegacyAdminCards() {
    document.querySelectorAll([
      '[data-admin-content-card]',
      '.admin-attendance-card',
      '.admin-training-card',
      '[data-reports-card]',
      '[data-audit-history-card]',
      '.audit-history-card',
      '[data-admin-referrals-card]',
      '.admin-referrals-card',
      '[data-admin-points-card]',
      '.admin-points-card',
      '[data-notification-history-card]',
      '.notification-history-card',
      '[data-notification-settings-card]',
      '[data-phase32-qa-card]',
      '[data-signup-dashboard-card="admin"]',
      '.admin-signup-card',
      '[data-phase31-training-manager]',
      '[data-phase31-admin-hub]'
    ].join(',')).forEach(card => {
      if (card.dataset.phase34Entry === 'true' || card.dataset.phase34Shell === 'true') return;
      card.dataset.adminOwned = 'true';
      card.dataset.dashboardCardRole = 'admin';
      card.dataset.phase34LegacyRetired = 'true';
    });
  }

  function homeMarkup() {
    const counts = adminCounts();
    return `
      <div class="phase34-admin-home-grid">
        <button class="phase34-admin-home-card" type="button" data-phase34-area="opportunities"><strong>Content</strong><span>Edit opportunity listings and sessions</span></button>
        <button class="phase34-admin-home-card" type="button" data-phase34-area="signups"><strong>${counts.pendingSignups || 0}</strong><span>Sign-ups needing review</span></button>
        <button class="phase34-admin-home-card" type="button" data-phase34-area="attendance"><strong>${counts.attendanceQueue || 0}</strong><span>Attendance items</span></button>
        <button class="phase34-admin-home-card" type="button" data-phase34-area="training"><strong>${counts.trainingQueue || 0}</strong><span>Training queue</span></button>
      </div>
      <div class="phase34-empty">Use the left navigation to open a focused admin workflow.</div>
    `;
  }

  function retiredLegacyMarkup(host) {
    host.insertAdjacentHTML('beforeend', '<div class="phase34-empty">This area is available from the focused admin pages.</div>');
  }

  function refreshAdminAreaData(area, options = {}) {
    if (!isAdmin() || !store()?.getSession?.()?.email) return;
    if (!['signups', 'attendance'].includes(area)) return;
    if (refreshState34.active.has(area)) return;
    if (refreshState34.completed.has(area) && options.force !== true) return;

    const task = dataAccess()?.refreshAdminQueue?.(area, options) || (area === 'signups'
      ? store()?.fetchSupabaseOpportunitySignups?.()
      : store()?.fetchSupabaseAttendanceClaims?.());

    if (!task || typeof task.then !== 'function') return;

    refreshState34.active.add(area);
    refreshState34.errors.delete(area);
    task
      .then(() => {
        refreshState34.completed.add(area);
        refreshEntry();
        if (state34.open && state34.activeArea === area) mountArea();
      })
      .catch(error => {
        refreshState34.errors.set(area, error?.message || `Could not refresh ${area} data.`);
        console.warn(`Could not refresh ${area} admin data`, error);
      })
      .finally(() => {
        refreshState34.active.delete(area);
      });
  }

  function mountArea() {
    const shell = ensureShell();
    if (!shell) return;
    markHiddenLegacyAdminCards();
    shell.innerHTML = shellMarkup();
    const nextHost = shell.querySelector('[data-phase34-page-cards]');
    if (!nextHost) return;

    const canonicalHandled = window.MENDAKIPhase35CanonicalAdminPages?.render?.(state34.activeArea, nextHost, {
      matchingCards: [],
      fallbackLegacyMarkup: retiredLegacyMarkup,
      homeMarkup,
      openShell,
      escapeHtml
    });

    if (canonicalHandled) return;

    if (state34.activeArea === 'home') {
      nextHost.innerHTML = homeMarkup();
      return;
    }

    retiredLegacyMarkup(nextHost);
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
    refreshAdminAreaData(area);
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
    markHiddenLegacyAdminCards();
    refreshEntry();
    if (state34.open) {
      mountArea();
      refreshAdminAreaData(state34.activeArea);
    }
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

  window.MENDAKIPhase34AdminShell = { install, openShell, closeShell, mountArea, refreshAdminAreaData };

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    window.setTimeout(install, 1800);
    window.setTimeout(install, 3200);
  });
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', () => {
    refreshState34.completed.clear();
    install();
  });
  window.addEventListener('volunteer-signups-synced', install);
  window.addEventListener('volunteer-attendance-synced', install);
  window.addEventListener('volunteer-training-signups-synced', install);
  window.addEventListener('mendaki-data-access-state', install);
})();
