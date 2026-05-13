const dashboardPageState = {
  activeView: 'home',
  installed: false
};

const dashboardViews = {
  home: {
    title: 'Dashboard home',
    copy: 'Choose what you want to manage.'
  },
  opportunities: {
    title: 'My volunteering opportunities',
    copy: 'Review your active sign-ups and completed volunteering opportunities.'
  },
  training: {
    title: 'My training',
    copy: 'Track your training sign-ups and completion status.'
  },
  attendance: {
    title: 'My attendance',
    copy: 'Check in, check out, and review submitted volunteering hours.'
  },
  settings: {
    title: 'Settings',
    copy: 'Update your profile details and account settings.'
  },
  admin: {
    title: 'Admin',
    copy: 'Review volunteer sign-ups, attendance records, and training completion.'
  }
};

function dashboardIsAdmin() {
  return Boolean(window.VolunteerDataStore?.isAdmin?.());
}

function dashboardSession() {
  return window.VolunteerDataStore?.getSession?.() || null;
}

function dashboardProfile() {
  return window.VolunteerDataStore?.getProfile?.() || null;
}

function dashboardLayout() {
  return document.querySelector('.dashboard-layout');
}

function dashboardSetCardRole(selector, role) {
  document.querySelectorAll(selector).forEach(card => {
    card.dataset.dashboardCardRole = role;
  });
}

function dashboardApplyCardRoles() {
  dashboardSetCardRole('[aria-labelledby="stats-title"]', 'stats');
  dashboardSetCardRole('[aria-labelledby="profile-form-title"]', 'settings');
  dashboardSetCardRole('[aria-labelledby="roadmap-title"]', 'settings');
  dashboardSetCardRole('[data-signup-dashboard-card="upcoming"], [data-signup-dashboard-card="completed"]', 'opportunities');
  dashboardSetCardRole('[data-signup-dashboard-card="admin"], .admin-attendance-card, .admin-training-card', 'admin');
  dashboardSetCardRole('.attendance-card:not(.admin-attendance-card)', 'attendance');
  dashboardSetCardRole('.training-dashboard-card:not(.admin-training-card)', 'training');
}

function dashboardMetric(selector, fallback = '0') {
  return document.querySelector(selector)?.textContent?.trim() || fallback;
}

function dashboardUpdateStatsLoadingState() {
  const statsCard = document.querySelector('[aria-labelledby="stats-title"]');
  if (!statsCard) return;
  const values = ['[data-stat-hours]', '[data-stat-upcoming]', '[data-stat-completed]']
    .map(selector => dashboardMetric(selector, '—'));
  const loading = values.some(value => !value || value === '—');
  statsCard.setAttribute('aria-busy', String(loading));
}

function dashboardTrainingMetric() {
  const count = window.VolunteerDataStore?.getTrainingSignups?.()
    ?.filter(item => item.email === window.VolunteerDataStore?.currentEmail?.() && !['cancelled', 'declined', 'no_show'].includes(item.status))
    ?.length || 0;
  return count ? `${count} training sign-up${count === 1 ? '' : 's'}` : 'Sign-ups and completion status';
}

function dashboardTile(view, icon, title, copy) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dashboard-module-tile';
  button.dataset.dashboardViewTarget = view;
  button.innerHTML = `
    <span class="dashboard-module-icon" aria-hidden="true">${icon}</span>
    <span><strong>${title}</strong><span>${copy}</span></span>
  `;
  return button;
}

function dashboardBuildHome() {
  let home = document.querySelector('[data-dashboard-app-home]');
  if (home) return home;

  home = document.createElement('section');
  home.className = 'dashboard-card dashboard-app-home';
  home.dataset.dashboardAppHome = 'true';
  home.innerHTML = `
    <div class="dashboard-hub-header">
      <div>
        <p class="eyebrow dark">App home</p>
        <h2>What would you like to manage?</h2>
        <p>Access your volunteering, training, attendance, and account settings from here.</p>
      </div>
    </div>
    <div class="dashboard-module-grid" data-dashboard-module-grid></div>
  `;

  const layout = dashboardLayout();
  const profileCard = document.querySelector('.dashboard-profile-card');
  if (layout && profileCard) profileCard.insertAdjacentElement('afterend', home);
  else layout?.prepend(home);
  return home;
}

function dashboardRenderHomeTiles() {
  const home = dashboardBuildHome();
  const grid = home.querySelector('[data-dashboard-module-grid]');
  if (!grid) return;

  const upcoming = dashboardMetric('[data-stat-upcoming]', '—');
  const completed = dashboardMetric('[data-stat-completed]', '—');
  const hours = dashboardMetric('[data-stat-hours]', '—');

  const tiles = [
    dashboardTile('opportunities', '🤝', 'My volunteering opportunities', `${upcoming} upcoming · ${completed} completed`),
    dashboardTile('training', '🎓', 'My training', dashboardTrainingMetric()),
    dashboardTile('attendance', '🕒', 'My attendance', `${hours} verified hours logged`),
    dashboardTile('settings', '⚙️', 'Settings', 'Profile, availability, and account actions')
  ];

  if (dashboardIsAdmin()) {
    tiles.push(dashboardTile('admin', '🛠️', 'Admin', 'Review sign-ups, attendance, and training'));
  }

  grid.replaceChildren(...tiles);
  dashboardUpdateStatsLoadingState();
}

function dashboardBuildModuleShell() {
  let shell = document.querySelector('[data-dashboard-module-shell]');
  if (shell) return shell;

  shell = document.createElement('section');
  shell.className = 'dashboard-module-shell';
  shell.dataset.dashboardModuleShell = 'true';
  shell.innerHTML = `
    <div class="dashboard-module-header">
      <div>
        <p class="eyebrow dark">Dashboard</p>
        <h2 data-dashboard-module-title>Dashboard</h2>
        <p data-dashboard-module-copy>Choose a module.</p>
      </div>
      <button class="button dashboard-secondary dashboard-module-back" type="button" data-dashboard-view-target="home">Back to app home</button>
    </div>
  `;

  dashboardLayout()?.prepend(shell);
  return shell;
}

function dashboardRefreshTrainingSections() {
  if (typeof window.phaseFourRender === 'function') window.phaseFourRender();
}

function dashboardSetView(view = 'home') {
  const nextView = dashboardViews[view] ? view : 'home';
  if (nextView === 'admin' && !dashboardIsAdmin()) return dashboardSetView('home');

  dashboardPageState.activeView = nextView;
  const layout = dashboardLayout();
  if (!layout) return;

  layout.classList.add('dashboard-paged');
  layout.dataset.dashboardView = nextView;
  dashboardRefreshTrainingSections();
  dashboardApplyCardRoles();
  dashboardRenderHomeTiles();

  const shell = dashboardBuildModuleShell();
  const config = dashboardViews[nextView];
  const title = shell.querySelector('[data-dashboard-module-title]');
  const copy = shell.querySelector('[data-dashboard-module-copy]');
  if (title) title.textContent = config.title;
  if (copy) copy.textContent = config.copy;
  shell.classList.toggle('active', nextView !== 'home');

  document.querySelectorAll('[data-dashboard-view-target]').forEach(button => {
    button.classList.toggle('active', button.dataset.dashboardViewTarget === nextView);
  });

  dashboardUpdateStatsLoadingState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function dashboardInstall() {
  const layout = dashboardLayout();
  if (!layout) return;

  layout.classList.add('dashboard-paged');
  dashboardRefreshTrainingSections();
  dashboardApplyCardRoles();
  dashboardBuildHome();
  dashboardBuildModuleShell();
  dashboardSetView(dashboardPageState.activeView || 'home');
  dashboardUpdateStatsLoadingState();
}

function dashboardBind() {
  if (dashboardPageState.installed) return;
  dashboardPageState.installed = true;

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-dashboard-view-target]');
    if (!target) return;
    event.preventDefault();
    dashboardSetView(target.dataset.dashboardViewTarget || 'home');
  }, true);

  window.addEventListener('hashchange', () => {
    if (window.location.hash.replace('#', '') === 'dashboard') dashboardSetView('home');
  });

  window.addEventListener('volunteer-auth-ready', dashboardInstall);
  window.addEventListener('volunteer-auth-changed', () => dashboardSetView('home'));
  window.addEventListener('volunteer-signups-synced', dashboardInstall);
  window.addEventListener('volunteer-training-signups-synced', dashboardInstall);
  window.addEventListener('volunteer-training-sessions-synced', dashboardInstall);
}

document.addEventListener('DOMContentLoaded', () => {
  dashboardBind();
  window.setTimeout(dashboardInstall, 0);
  window.setTimeout(dashboardInstall, 250);
});
