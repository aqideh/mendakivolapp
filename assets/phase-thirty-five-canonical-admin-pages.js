(() => {
  if (window.__phaseThirtyFiveCanonicalAdminPagesInstalled) return;
  window.__phaseThirtyFiveCanonicalAdminPagesInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }
  function appState() { try { return typeof state !== 'undefined' ? state : null; } catch (_) { return null; } }
  function opportunities() { return appState()?.data?.opportunities || []; }
  function sessions() { return appState()?.data?.sessions || []; }
  function trainings() { return appState()?.data?.trainings || []; }
  function news() { return appState()?.data?.news || []; }
  function signups() { return store()?.getOpportunitySignups?.() || []; }
  function attendanceClaims() { return store()?.getAttendanceClaims?.() || []; }
  function trainingSignups() { return store()?.getTrainingSignups?.() || []; }

  function countBy(items, predicate) { return items.filter(predicate).length; }
  function statusOf(item) { return String(item.status || item.claimStatus || item.claim_status || ''); }
  function fmt(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }
  function phase36(area, host, ctx) { return Boolean(window.MENDAKIPhase36AdminTables?.render?.(area, host, ctx)); }
  function phase42(area, host) { return Boolean(window.MENDAKIPhase42CanonicalAdminTools?.render?.(area, host)); }
  function tile(label, value) { return `<div class="phase35-summary-tile"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`; }
  function badge(status) {
    const s = String(status || 'unknown');
    const good = ['confirmed', 'registered', 'completed', 'verified', 'Open', 'open'].includes(s);
    const warn = ['pending_review', 'waitlisted', 'checked_in', 'submitted', 'clarification_requested'].includes(s);
    return `<span class="phase35-status-pill ${good ? 'good' : warn ? 'warn' : ''}">${escapeHtml(s)}</span>`;
  }
  function table(title, headers, rows, empty = 'No records found.') {
    if (!rows.length) return `<section class="phase35-table-card"><h4>${escapeHtml(title)}</h4><div class="phase35-empty-state">${escapeHtml(empty)}</div></section>`;
    return `<section class="phase35-table-card"><h4>${escapeHtml(title)}</h4><table class="phase35-table"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></section>`;
  }
  function legacy(host, ctx) { if (typeof ctx?.fallbackLegacyMarkup === 'function') ctx.fallbackLegacyMarkup(host, []); }
  function shellButton(area, label) { return `<button class="button dashboard-secondary" type="button" data-phase34-area="${escapeHtml(area)}">${escapeHtml(label)}</button>`; }

  function renderHome(host) {
    const pendingSignups = countBy(signups(), s => ['pending_review', 'waitlisted'].includes(statusOf(s)));
    const attendanceQueue = countBy(attendanceClaims(), c => ['checked_in', 'submitted', 'clarification_requested'].includes(statusOf(c)));
    const trainingQueue = countBy(trainingSignups(), t => ['registered', 'waitlisted'].includes(statusOf(t)));
    host.innerHTML = `<div class="phase35-page"><div class="phase35-summary-grid">${tile('Opportunity sign-up queue', pendingSignups)}${tile('Attendance queue', attendanceQueue)}${tile('Training queue', trainingQueue)}${tile('Published opportunities', opportunities().length)}</div><div class="phase35-action-grid"><article class="phase35-action-card"><strong>Manage opportunities</strong><span>Edit opportunity listings and sessions.</span>${shellButton('opportunities', 'Open opportunities')}</article><article class="phase35-action-card"><strong>Review sign-ups</strong><span>Process pending and waitlisted opportunity registrations.</span>${shellButton('signups', 'Open sign-ups')}</article><article class="phase35-action-card"><strong>Review attendance</strong><span>Verify check-ins, submitted hours, and session claims.</span>${shellButton('attendance', 'Open attendance')}</article><article class="phase35-action-card"><strong>Manage training</strong><span>Create sessions and review training completions.</span>${shellButton('training', 'Open training')}</article></div><div class="phase35-page-note">Canonical admin pages are the primary admin surface. Legacy dashboard cards are hidden and no longer mounted into the shell.</div></div>`;
    return true;
  }

  function renderContent(host, ctx) {
    host.innerHTML = `<div class="phase35-page"><div class="phase35-summary-grid">${tile('News items', news().length)}${tile('Public opportunities', opportunities().length)}${tile('Training cards', trainings().length)}</div><div class="phase35-action-grid"><article class="phase35-action-card"><strong>Static site content</strong><span>Static content editing is not yet migrated to a canonical tool.</span></article><article class="phase35-action-card"><strong>Operational content moved out</strong><span>Opportunity and training operational editing happens in their canonical pages.</span></article></div></div>`;
    legacy(host.querySelector('.phase35-page'), ctx);
    return true;
  }

  function renderOpportunities(host) {
    host.innerHTML = `<div class="phase35-page" data-opportunity-admin-canonical-page><div class="phase35-summary-grid">${tile('Parent opportunities', opportunities().length)}${tile('Session rows', sessions().length)}${tile('Active sign-ups', countBy(signups(), s => !['cancelled', 'declined'].includes(statusOf(s))))}</div><div class="phase35-page-note">Canonical owner: parent listings, opportunity sessions, capacity, waitlist, and facilitator code configuration.</div><div class="admin-content-workspace" data-content-workspace data-opportunity-admin-canonical-workspace></div></div>`;
    const workspace = host.querySelector('[data-opportunity-admin-canonical-workspace]');
    if (window.MENDAKIAdminOpportunityHierarchy?.renderOpportunityHierarchy) window.MENDAKIAdminOpportunityHierarchy.renderOpportunityHierarchy();
    else if (workspace) workspace.innerHTML = '<section class="admin-content-step"><h3>Opportunity editor is still loading.</h3><p class="dashboard-muted">Refresh if this message does not clear.</p></section>';
    return true;
  }

  function renderSignups(host, ctx) { if (phase36('signups', host, ctx)) return true; return renderFallbackSignups(host, ctx); }
  function renderFallbackSignups(host, ctx) {
    const queue = signups().filter(s => ['pending_review', 'waitlisted', 'confirmed', 'registered'].includes(statusOf(s))).slice(0, 12);
    const rows = queue.map(s => `<tr><td>${escapeHtml(s.volunteerName || s.volunteer_name || s.email || '-')}</td><td>${escapeHtml(s.title || s.opportunityTitle || s.opportunity_id || '-')}</td><td>${escapeHtml(s.sessionTitle || s.session_id || '-')}</td><td>${badge(statusOf(s))}</td><td>${escapeHtml(fmt(s.signedUpAt || s.created_at))}</td></tr>`);
    host.innerHTML = `<div class="phase35-page"><div class="phase35-summary-grid">${tile('Pending review', countBy(signups(), s => statusOf(s) === 'pending_review'))}${tile('Waitlisted', countBy(signups(), s => statusOf(s) === 'waitlisted'))}${tile('Confirmed/registered', countBy(signups(), s => ['confirmed', 'registered'].includes(statusOf(s))))}</div>${table('Opportunity sign-up queue preview', ['Volunteer', 'Opportunity', 'Session', 'Status', 'Submitted'], rows)}</div>`;
    legacy(host.querySelector('.phase35-page'), ctx); return true;
  }
  function renderAttendance(host, ctx) { if (phase36('attendance', host, ctx)) return true; return renderFallbackAttendance(host, ctx); }
  function renderFallbackAttendance(host, ctx) {
    const rows = attendanceClaims().slice(0, 12).map(c => `<tr><td>${escapeHtml(c.volunteerName || c.volunteer_name || c.email || '-')}</td><td>${escapeHtml(c.title || c.opportunityTitle || c.opportunity_id || '-')}</td><td>${escapeHtml(c.sessionTitle || c.session_id || '-')}</td><td>${escapeHtml(c.hours || c.claimed_hours || '-')}</td><td>${badge(statusOf(c))}</td></tr>`);
    host.innerHTML = `<div class="phase35-page"><div class="phase35-summary-grid">${tile('Checked in', countBy(attendanceClaims(), c => statusOf(c) === 'checked_in'))}${tile('Submitted', countBy(attendanceClaims(), c => statusOf(c) === 'submitted'))}${tile('Verified', countBy(attendanceClaims(), c => statusOf(c) === 'verified'))}</div>${table('Attendance review preview', ['Volunteer', 'Opportunity', 'Session', 'Hours', 'Status'], rows)}</div>`;
    legacy(host.querySelector('.phase35-page'), ctx); return true;
  }
  function renderTraining(host, ctx) { if (phase36('training', host, ctx)) return true; return renderFallbackTraining(host, ctx); }
  function renderFallbackTraining(host, ctx) {
    const rows = trainings().slice(0, 10).map(t => `<tr><td><strong>${escapeHtml(t.title || t.id)}</strong><br><span class="dashboard-muted">${escapeHtml(t.sessionTitle || t.trainer || '')}</span></td><td>${escapeHtml(fmt(t.startsAt || t.date))}</td><td>${escapeHtml(t.location || '-')}</td><td>${escapeHtml(t.capacity || 'unlimited')}</td><td>${badge(t.status || 'Open')}</td></tr>`);
    host.innerHTML = `<div class="phase35-page"><div class="phase35-summary-grid">${tile('Training rows', trainings().length)}${tile('Training sign-ups', trainingSignups().length)}${tile('Completed', countBy(trainingSignups(), t => statusOf(t) === 'completed'))}</div>${table('Training programme/session preview', ['Training', 'Date', 'Location', 'Capacity', 'Status'], rows)}<div class="phase35-page-note">Canonical owner: parent training rows, child sessions, training sign-ups, completion review, and training points context.</div></div>`;
    legacy(host.querySelector('.phase35-page'), ctx); return true;
  }
  function renderSimple(host, ctx, config) {
    if (config.phase42Area && phase42(config.phase42Area, host)) return true;
    if (config.phase36Area && phase36(config.phase36Area, host, ctx)) return true;
    host.innerHTML = `<div class="phase35-page"><div class="phase35-action-grid">${(config.actions || []).map(action => `<article class="phase35-action-card"><strong>${escapeHtml(action[0])}</strong><span>${escapeHtml(action[1])}</span></article>`).join('')}</div><div class="phase35-page-note">${escapeHtml(config.note || 'Canonical replacement is still in progress.')}</div></div>`;
    legacy(host.querySelector('.phase35-page'), ctx); return true;
  }

  const RENDERERS = {
    home: renderHome,
    content: renderContent,
    opportunities: renderOpportunities,
    signups: renderSignups,
    attendance: renderAttendance,
    training: renderTraining,
    referrals: (host, ctx) => renderSimple(host, ctx, { phase36Area: 'referrals', actions: [['Referral tracking', 'Review referral codes and status workflow.']] }),
    points: (host, ctx) => renderSimple(host, ctx, { phase36Area: 'points', actions: [['Points ledger', 'Review awarded points.']] }),
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
