(() => {
  if (window.__phaseThirtyFiveCanonicalAdminPagesInstalled) return;
  window.__phaseThirtyFiveCanonicalAdminPagesInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }
  function appState() { try { return typeof state !== 'undefined' ? state : null; } catch (_) { return null; } }
  function opportunities() { return appState()?.data?.opportunities || []; }
  function sessions() { return appState()?.data?.sessions || []; }
  function signups() { return store()?.getOpportunitySignups?.() || []; }
  function attendanceClaims() { return store()?.getAttendanceClaims?.() || []; }
  function trainingSignups() { return store()?.getTrainingSignups?.() || []; }

  function countBy(items, predicate) { return items.filter(predicate).length; }
  function statusOf(item) { return String(item.status || item.claimStatus || item.claim_status || ''); }
  function phase36(area, host, ctx) { return Boolean(window.MENDAKIPhase36AdminTables?.render?.(area, host, ctx)); }
  function phase42(area, host) { return Boolean(window.MENDAKIPhase42CanonicalAdminTools?.render?.(area, host)); }
  function tile(label, value) { return `<div class="phase35-summary-tile"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`; }
  function legacy(host, ctx) { if (typeof ctx?.fallbackLegacyMarkup === 'function') ctx.fallbackLegacyMarkup(host, []); }
  function shellButton(area, label) { return `<button class="button dashboard-secondary" type="button" data-phase34-area="${escapeHtml(area)}">${escapeHtml(label)}</button>`; }

  function renderHome(host) {
    const pendingSignups = countBy(signups(), s => ['pending_review', 'waitlisted'].includes(statusOf(s)));
    const attendanceQueue = countBy(attendanceClaims(), c => ['checked_in', 'submitted', 'clarification_requested'].includes(statusOf(c)));
    const trainingQueue = countBy(trainingSignups(), t => ['registered', 'waitlisted'].includes(statusOf(t)));
    host.innerHTML = `<div class="phase35-page"><div class="phase35-summary-grid">${tile('Opportunity sign-up queue', pendingSignups)}${tile('Attendance queue', attendanceQueue)}${tile('Training queue', trainingQueue)}${tile('Published opportunities', opportunities().length)}</div><div class="phase35-action-grid"><article class="phase35-action-card"><strong>Manage opportunities</strong><span>Edit opportunity listings and sessions.</span>${shellButton('opportunities', 'Open opportunities')}</article><article class="phase35-action-card"><strong>Edit content</strong><span>Create and edit news items.</span>${shellButton('content', 'Open content')}</article><article class="phase35-action-card"><strong>Manage training</strong><span>Create training rows and review training queue.</span>${shellButton('training', 'Open training')}</article><article class="phase35-action-card"><strong>Reports and audit</strong><span>Run reports and audit checks.</span>${shellButton('reports', 'Open reports')}</article></div><div class="phase35-page-note">Canonical admin pages are the primary admin surface. Legacy dashboard cards are hidden and no longer mounted into the shell.</div></div>`;
    return true;
  }

  function renderOpportunities(host) {
    host.innerHTML = `<div class="phase35-page" data-opportunity-admin-canonical-page><div class="phase35-summary-grid">${tile('Parent opportunities', opportunities().length)}${tile('Session rows', sessions().length)}${tile('Active sign-ups', countBy(signups(), s => !['cancelled', 'declined'].includes(statusOf(s))))}</div><div class="phase35-page-note">Canonical owner: parent listings, opportunity sessions, capacity, waitlist, and facilitator code configuration.</div><div class="admin-content-workspace" data-content-workspace data-opportunity-admin-canonical-workspace></div></div>`;
    const workspace = host.querySelector('[data-opportunity-admin-canonical-workspace]');
    if (window.MENDAKIAdminOpportunityHierarchy?.renderOpportunityHierarchy) window.MENDAKIAdminOpportunityHierarchy.renderOpportunityHierarchy();
    else if (workspace) workspace.innerHTML = '<section class="admin-content-step"><h3>Opportunity editor is still loading.</h3><p class="dashboard-muted">Refresh if this message does not clear.</p></section>';
    return true;
  }

  function renderSimple(host, ctx, config) {
    if (config.phase42Area && phase42(config.phase42Area, host)) return true;
    if (config.phase36Area && phase36(config.phase36Area, host, ctx)) return true;
    host.innerHTML = `<div class="phase35-page"><div class="phase35-action-grid">${(config.actions || []).map(action => `<article class="phase35-action-card"><strong>${escapeHtml(action[0])}</strong><span>${escapeHtml(action[1])}</span></article>`).join('')}</div><div class="phase35-page-note">${escapeHtml(config.note || 'Canonical replacement is still loading or not available.')}</div></div>`;
    legacy(host.querySelector('.phase35-page'), ctx);
    return true;
  }

  const RENDERERS = {
    home: renderHome,
    content: (host, ctx) => renderSimple(host, ctx, { phase42Area: 'content', actions: [['Content editor', 'Create and edit news items.']] }),
    opportunities: renderOpportunities,
    signups: (host, ctx) => renderSimple(host, ctx, { phase36Area: 'signups', actions: [['Sign-up queue', 'Review sign-ups.']] }),
    attendance: (host, ctx) => renderSimple(host, ctx, { phase36Area: 'attendance', actions: [['Attendance queue', 'Review attendance.']] }),
    training: (host, ctx) => renderSimple(host, ctx, { phase42Area: 'training', phase36Area: 'training', actions: [['Training editor', 'Create and edit training rows.']] }),
    referrals: (host, ctx) => renderSimple(host, ctx, { phase36Area: 'referrals', actions: [['Referral tracking', 'Review referral codes and status workflow.']] }),
    points: (host, ctx) => renderSimple(host, ctx, { phase42Area: 'points', phase36Area: 'points', actions: [['Points ledger', 'Review awarded points.']] }),
    reports: (host, ctx) => renderSimple(host, ctx, { phase42Area: 'reports', actions: [['Report runner', 'Run reports and export CSV.']] }),
    audit: (host, ctx) => renderSimple(host, ctx, { phase42Area: 'audit', actions: [['Audit search', 'Search and export audit rows.']] }),
    notifications: (host, ctx) => renderSimple(host, ctx, { phase42Area: 'notifications', actions: [['Notification history', 'Review notification rows.']] }),
    system: (host, ctx) => renderSimple(host, ctx, { phase42Area: 'system', actions: [['QA checks', 'Run smoke checks and production gate review.']] })
  };

  function render(area, host, ctx = {}) {
    const fn = RENDERERS[area];
    if (!fn || !host) return false;
    fn(host, ctx);
    return true;
  }
  window.MENDAKIPhase35CanonicalAdminPages = { render };
})();
