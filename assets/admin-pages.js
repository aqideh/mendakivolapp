(() => {
  if (window.__mendakiAdminPagesInstalled) return;
  window.__mendakiAdminPagesInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function dataAccess() { return window.MENDAKIDataAccess; }
  function adminTables() { return window.MENDAKIAdminTables; }
  function adminTools() { return window.MENDAKIAdminTools; }
  function escapeHtml(value) { return store().utils.escapeHtml(value); }
  function appData() { return window.state.data; }
  function opportunities() { return appData().opportunities || []; }
  function sessions() { return appData().sessions || []; }
  function signups() { return dataAccess().listOpportunitySignups(); }
  function attendanceClaims() { return dataAccess().listAttendanceClaims(); }
  function trainingSignups() { return dataAccess().listTrainingSignups(); }

  function countBy(items, predicate) { return items.filter(predicate).length; }
  function statusOf(item) { return String(item.status || item.claimStatus || item.claim_status || ''); }
  function tile(label, value) { return `<div class="phase35-summary-tile"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`; }
  function workspaceButton(area, label) { return `<button class="button dashboard-secondary" type="button" data-admin-workspace-area="${escapeHtml(area)}">${escapeHtml(label)}</button>`; }

  function renderHome(host) {
    const pendingSignups = countBy(signups(), s => ['pending_review', 'waitlisted'].includes(statusOf(s)));
    const attendanceQueue = countBy(attendanceClaims(), c => ['checked_in', 'submitted', 'clarification_requested'].includes(statusOf(c)));
    const trainingQueue = countBy(trainingSignups(), t => ['registered', 'waitlisted'].includes(statusOf(t)));
    host.innerHTML = `<div class="phase35-page"><div class="phase35-summary-grid">${tile('Opportunity sign-up queue', pendingSignups)}${tile('Attendance queue', attendanceQueue)}${tile('Training queue', trainingQueue)}${tile('Published opportunities', opportunities().length)}</div><div class="phase35-action-grid"><article class="phase35-action-card"><strong>Manage opportunities</strong><span>Edit opportunity listings and sessions.</span>${workspaceButton('opportunities', 'Open opportunities')}</article><article class="phase35-action-card"><strong>Edit content</strong><span>Create and edit news items.</span>${workspaceButton('content', 'Open content')}</article><article class="phase35-action-card"><strong>Manage training</strong><span>Create training rows and review training queue.</span>${workspaceButton('training', 'Open training')}</article><article class="phase35-action-card"><strong>Reports and audit</strong><span>Run reports and audit checks.</span>${workspaceButton('reports', 'Open reports')}</article></div></div>`;
    return true;
  }

  function renderOpportunities(host) {
    host.innerHTML = `<div class="phase35-page" data-opportunity-admin-canonical-page><div class="phase35-summary-grid">${tile('Parent opportunities', opportunities().length)}${tile('Session rows', sessions().length)}</div><div class="phase35-page-note">Manage parent listings, opportunity sessions, capacity, waitlist, facilitator code configuration, photos, and delete actions.</div><div class="admin-content-workspace" data-content-workspace data-opportunity-admin-canonical-workspace></div></div>`;
    window.MENDAKIAdminOpportunityHierarchy.renderOpportunityHierarchy();
    return true;
  }

  function renderTable(area, host) {
    return adminTables().render(area, host);
  }

  function renderTool(area, host) {
    return adminTools().render(area, host);
  }

  const RENDERERS = {
    home: renderHome,
    content: host => renderTool('content', host),
    opportunities: renderOpportunities,
    signups: host => renderTable('signups', host),
    attendance: host => renderTable('attendance', host),
    training: host => renderTool('training', host),
    referrals: host => renderTable('referrals', host),
    points: host => renderTool('points', host),
    reports: host => renderTool('reports', host),
    audit: host => renderTool('audit', host),
    notifications: host => renderTool('notifications', host),
    system: host => renderTool('system', host)
  };

  function render(area, host) {
    const fn = RENDERERS[area];
    if (!fn || !host) return false;
    return fn(host);
  }

  window.MENDAKIAdminPages = Object.freeze({ render });
})();
