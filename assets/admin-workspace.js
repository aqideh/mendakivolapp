(() => {
  if (window.__mendakiAdminWorkspaceInstalled) return;
  window.__mendakiAdminWorkspaceInstalled = true;

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

  const workspaceState = { activeArea: 'home', open: false };
  const refreshState = { active: new Set(), completed: new Set(), errors: new Map() };

  function store() { return window.VolunteerDataStore; }
  function dataAccess() { return window.MENDAKIDataAccess; }
  function pages() { return window.MENDAKIAdminPages; }
  function isAdmin() { return store().isAdmin(); }
  function layout() { return document.querySelector('.dashboard-layout'); }
  function escapeHtml(value) { return store().utils.escapeHtml(value); }
  function adminCounts() { return dataAccess().adminQueueCounts(); }

  function ensureEntry() {
    if (!isAdmin()) return null;
    let entry = document.querySelector('[data-admin-workspace-entry]');
    if (entry) {
      entry.dataset.dashboardCardRole = 'admin';
      return entry;
    }
    entry = document.createElement('section');
    entry.className = 'dashboard-card phase34-admin-entry';
    entry.dataset.adminWorkspaceEntry = 'true';
    entry.dataset.dashboardCardRole = 'admin';
    entry.innerHTML = entryMarkup();
    layout().append(entry);
    return entry;
  }

  function entryMarkup() {
    const counts = adminCounts();
    return `<div class="section-header"><div><p class="eyebrow dark">Admin</p><h2>Admin workspace</h2><p class="dashboard-muted">Open the admin interface to manage queues, content, reporting, and operations.</p></div><button class="button button-primary" type="button" data-admin-workspace-open>Open admin workspace</button></div><div class="phase34-admin-entry-grid"><div class="phase34-admin-entry-tile"><strong>${counts.pendingSignups || 0}</strong><span>Pending / waitlisted sign-ups</span></div><div class="phase34-admin-entry-tile"><strong>${counts.attendanceQueue || 0}</strong><span>Attendance queue</span></div><div class="phase34-admin-entry-tile"><strong>${counts.trainingQueue || 0}</strong><span>Training queue</span></div></div>`;
  }

  function ensureShell() {
    if (!isAdmin()) return null;
    let shell = document.querySelector('[data-admin-workspace-shell]');
    if (shell) return shell;
    shell = document.createElement('section');
    shell.className = 'phase34-admin-shell';
    shell.dataset.adminWorkspaceShell = 'true';
    shell.dataset.dashboardCardRole = 'admin';
    shell.hidden = !workspaceState.open;
    shell.innerHTML = shellMarkup();
    ensureEntry().insertAdjacentElement('afterend', shell);
    return shell;
  }

  function shellMarkup() {
    const [title, description] = AREA_COPY[workspaceState.activeArea] || AREA_COPY.home;
    return `<header class="phase34-admin-header"><div><p class="eyebrow dark">Admin workspace</p><h2>Admin interface</h2><p class="dashboard-muted">Use the focused admin pages below to manage operational workflows.</p></div><button class="button dashboard-secondary" type="button" data-admin-workspace-close>Back to dashboard</button></header><div class="phase34-admin-body"><nav class="phase34-admin-nav" aria-label="Admin workspace navigation">${AREAS.map(([key, label]) => `<button type="button" class="${key === workspaceState.activeArea ? 'active' : ''}" data-admin-workspace-area="${key}"><span>${escapeHtml(label)}</span></button>`).join('')}</nav><main class="phase34-admin-page-wrap" data-admin-workspace-page-wrap data-admin-workspace-active-area="${escapeHtml(workspaceState.activeArea)}"><div class="phase34-admin-page-head"><div><p class="eyebrow dark">${escapeHtml(workspaceState.activeArea)}</p><h3 data-admin-workspace-page-title>${escapeHtml(title)}</h3><p class="dashboard-muted" data-admin-workspace-page-description>${escapeHtml(description)}</p></div></div><div class="phase34-admin-cards" data-admin-workspace-page-cards></div></main></div>`;
  }

  function hideOwnedAdminCards() {
    document.querySelectorAll([
      '[data-admin-content-card]', '.admin-attendance-card', '.admin-training-card', '[data-reports-card]', '[data-audit-history-card]', '.audit-history-card', '[data-admin-referrals-card]', '.admin-referrals-card', '[data-admin-points-card]', '.admin-points-card', '[data-notification-history-card]', '.notification-history-card', '[data-notification-settings-card]', '[data-phase32-qa-card]', '[data-signup-dashboard-card="admin"]', '.admin-signup-card', '[data-phase31-training-manager]', '[data-phase31-admin-hub]'
    ].join(',')).forEach(card => {
      if (card.dataset.adminWorkspaceEntry === 'true' || card.dataset.adminWorkspaceShell === 'true') return;
      card.dataset.adminOwned = 'true';
      card.dataset.dashboardCardRole = 'admin';
      card.hidden = true;
    });
  }

  function homeMarkup() {
    const counts = adminCounts();
    return `<div class="phase34-admin-home-grid"><button class="phase34-admin-home-card" type="button" data-admin-workspace-area="opportunities"><strong>Content</strong><span>Edit opportunity listings and sessions</span></button><button class="phase34-admin-home-card" type="button" data-admin-workspace-area="signups"><strong>${counts.pendingSignups || 0}</strong><span>Sign-ups needing review</span></button><button class="phase34-admin-home-card" type="button" data-admin-workspace-area="attendance"><strong>${counts.attendanceQueue || 0}</strong><span>Attendance items</span></button><button class="phase34-admin-home-card" type="button" data-admin-workspace-area="training"><strong>${counts.trainingQueue || 0}</strong><span>Training queue</span></button></div><div class="phase34-empty">Use the left navigation to open a focused admin workflow.</div>`;
  }

  function refreshAdminAreaData(area, options = {}) {
    if (!isAdmin() || !store().getSession().email) return;
    if (!['signups', 'attendance'].includes(area)) return;
    if (refreshState.active.has(area)) return;
    if (refreshState.completed.has(area) && options.force !== true) return;
    const task = dataAccess().refreshAdminQueue(area, options);
    refreshState.active.add(area);
    refreshState.errors.delete(area);
    task.then(() => {
      refreshState.completed.add(area);
      refreshEntry();
      if (workspaceState.open && workspaceState.activeArea === area) mountArea();
    }).catch(error => {
      refreshState.errors.set(area, error.message || `Could not refresh ${area} data.`);
      console.warn(`Could not refresh ${area} admin data`, error);
    }).finally(() => refreshState.active.delete(area));
  }

  function mountArea() {
    const shell = ensureShell();
    if (!shell) return;
    hideOwnedAdminCards();
    shell.innerHTML = shellMarkup();
    const host = shell.querySelector('[data-admin-workspace-page-cards]');
    if (!host) return;
    if (workspaceState.activeArea === 'home') {
      host.innerHTML = homeMarkup();
      return;
    }
    const handled = pages().render(workspaceState.activeArea, host);
    if (!handled) host.innerHTML = '<div class="phase34-empty">This admin area is not configured yet.</div>';
  }

  function openShell(area = workspaceState.activeArea || 'home') {
    if (!isAdmin()) return;
    workspaceState.open = true;
    workspaceState.activeArea = area;
    document.body.classList.add('phase34-admin-shell-active');
    const shell = ensureShell();
    shell.hidden = false;
    ensureEntry();
    mountArea();
    refreshAdminAreaData(area);
    shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeShell() {
    workspaceState.open = false;
    const shell = ensureShell();
    if (shell) shell.hidden = true;
    document.body.classList.remove('phase34-admin-shell-active');
    ensureEntry().scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function refreshEntry() {
    const entry = ensureEntry();
    if (entry) entry.innerHTML = entryMarkup();
  }

  function install() {
    if (!isAdmin()) return;
    ensureEntry();
    ensureShell();
    hideOwnedAdminCards();
    refreshEntry();
    if (workspaceState.open) {
      mountArea();
      refreshAdminAreaData(workspaceState.activeArea);
    }
  }

  function bind() {
    document.addEventListener('click', event => {
      const open = event.target.closest('[data-admin-workspace-open]');
      if (open) { event.preventDefault(); openShell('home'); return; }
      const close = event.target.closest('[data-admin-workspace-close]');
      if (close) { event.preventDefault(); closeShell(); return; }
      const area = event.target.closest('[data-admin-workspace-area]');
      if (area && isAdmin()) { event.preventDefault(); openShell(area.getAttribute('data-admin-workspace-area') || 'home'); }
    }, true);
  }

  window.MENDAKIAdminWorkspace = Object.freeze({ install, openShell, closeShell, mountArea, refreshAdminAreaData });

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    window.setTimeout(install, 1800);
    window.setTimeout(install, 3200);
  });
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', () => { refreshState.completed.clear(); install(); });
  window.addEventListener('volunteer-signups-synced', install);
  window.addEventListener('volunteer-attendance-synced', install);
  window.addEventListener('volunteer-training-signups-synced', install);
  window.addEventListener('mendaki-data-access-state', install);
})();
