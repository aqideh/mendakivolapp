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

  function tile(label, value) {
    return `<div class="phase35-summary-tile"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function badge(status) {
    const s = String(status || 'unknown');
    const good = ['confirmed', 'registered', 'completed', 'verified', 'Open', 'open'].includes(s);
    const warn = ['pending_review', 'waitlisted', 'checked_in', 'submitted', 'clarification_requested'].includes(s);
    return `<span class="phase35-status-pill ${good ? 'good' : warn ? 'warn' : ''}">${escapeHtml(s)}</span>`;
  }

  function table(title, headers, rows, empty = 'No records found.') {
    if (!rows.length) return `<section class="phase35-table-card"><h4>${escapeHtml(title)}</h4><div class="phase35-empty-state">${escapeHtml(empty)}</div></section>`;
    return `
      <section class="phase35-table-card">
        <h4>${escapeHtml(title)}</h4>
        <table class="phase35-table">
          <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </section>
    `;
  }

  function legacy(host, ctx) {
    const cards = ctx?.matchingCards || [];
    if (cards.length && typeof ctx.fallbackLegacyMarkup === 'function') ctx.fallbackLegacyMarkup(host, cards);
  }

  function shellButton(area, label) {
    return `<button class="button dashboard-secondary" type="button" data-phase34-area="${escapeHtml(area)}">${escapeHtml(label)}</button>`;
  }

  function renderHome(host, ctx) {
    const pendingSignups = countBy(signups(), s => ['pending_review', 'waitlisted'].includes(statusOf(s)));
    const attendanceQueue = countBy(attendanceClaims(), c => ['checked_in', 'submitted', 'clarification_requested'].includes(statusOf(c)));
    const trainingQueue = countBy(trainingSignups(), t => ['registered', 'waitlisted'].includes(statusOf(t)));
    host.innerHTML = `
      <div class="phase35-page">
        <div class="phase35-summary-grid">
          ${tile('Opportunity sign-up queue', pendingSignups)}
          ${tile('Attendance queue', attendanceQueue)}
          ${tile('Training queue', trainingQueue)}
          ${tile('Published opportunities', opportunities().length)}
        </div>
        <div class="phase35-action-grid">
          <article class="phase35-action-card"><strong>Review sign-ups</strong><span>Process pending and waitlisted opportunity registrations.</span>${shellButton('signups', 'Open sign-ups')}</article>
          <article class="phase35-action-card"><strong>Review attendance</strong><span>Verify check-ins, submitted hours, and session claims.</span>${shellButton('attendance', 'Open attendance')}</article>
          <article class="phase35-action-card"><strong>Manage training</strong><span>Create sessions and review training completions.</span>${shellButton('training', 'Open training')}</article>
          <article class="phase35-action-card"><strong>Run readiness checks</strong><span>Use QA and production-readiness tools before demos.</span>${shellButton('system', 'Open System / QA')}</article>
        </div>
        <div class="phase35-page-note">Phase 35 canonical pages are now the primary admin surface. Existing tools remain available inside collapsed fallback sections until each workflow is fully rewritten.</div>
      </div>
    `;
    return true;
  }

  function renderContent(host, ctx) {
    host.innerHTML = `
      <div class="phase35-page">
        <div class="phase35-summary-grid">
          ${tile('News items', news().length)}
          ${tile('Public opportunities', opportunities().length)}
          ${tile('Training cards', trainings().length)}
        </div>
        <div class="phase35-action-grid">
          <article class="phase35-action-card"><strong>Static site content</strong><span>Use this page for news, about, FAQ, contact, and homepage copy.</span></article>
          <article class="phase35-action-card"><strong>Operational content moves out</strong><span>Opportunity and training operational editing should happen in their own canonical pages.</span></article>
        </div>
      </div>
    `;
    legacy(host.querySelector('.phase35-page'), ctx);
    return true;
  }

  function renderOpportunities(host, ctx) {
    const rows = opportunities().slice(0, 10).map(opp => {
      const oppSessions = sessions().filter(s => String(s.opportunityId || s.opportunity_id) === String(opp.id));
      return `<tr><td><strong>${escapeHtml(opp.title || opp.name || opp.id)}</strong><br><span class="dashboard-muted">${escapeHtml(opp.commitment || opp.type || '')}</span></td><td>${escapeHtml(oppSessions.length)}</td><td>${escapeHtml(opp.location || '-')}</td><td>${badge(opp.status || 'Open')}</td></tr>`;
    });
    host.innerHTML = `
      <div class="phase35-page">
        <div class="phase35-summary-grid">
          ${tile('Parent opportunities', opportunities().length)}
          ${tile('Session rows', sessions().length)}
          ${tile('Active sign-ups', countBy(signups(), s => !['cancelled', 'declined'].includes(statusOf(s))))}
        </div>
        ${table('Opportunity catalogue preview', ['Opportunity', 'Sessions', 'Location', 'Status'], rows)}
        <div class="phase35-page-note">Canonical owner: parent listings, opportunity sessions, capacity, waitlist, and facilitator code configuration.</div>
      </div>
    `;
    legacy(host.querySelector('.phase35-page'), ctx);
    return true;
  }

  function renderSignups(host, ctx) {
    const queue = signups().filter(s => ['pending_review', 'waitlisted', 'confirmed', 'registered'].includes(statusOf(s))).slice(0, 12);
    const rows = queue.map(s => `<tr><td>${escapeHtml(s.volunteerName || s.volunteer_name || s.email || '-')}</td><td>${escapeHtml(s.title || s.opportunityTitle || s.opportunity_id || '-')}</td><td>${escapeHtml(s.sessionTitle || s.session_id || '-')}</td><td>${badge(statusOf(s))}</td><td>${escapeHtml(fmt(s.signedUpAt || s.created_at))}</td></tr>`);
    host.innerHTML = `
      <div class="phase35-page">
        <div class="phase35-summary-grid">
          ${tile('Pending review', countBy(signups(), s => statusOf(s) === 'pending_review'))}
          ${tile('Waitlisted', countBy(signups(), s => statusOf(s) === 'waitlisted'))}
          ${tile('Confirmed/registered', countBy(signups(), s => ['confirmed', 'registered'].includes(statusOf(s))))}
        </div>
        ${table('Opportunity sign-up queue preview', ['Volunteer', 'Opportunity', 'Session', 'Status', 'Submitted'], rows)}
      </div>
    `;
    legacy(host.querySelector('.phase35-page'), ctx);
    return true;
  }

  function renderAttendance(host, ctx) {
    const rows = attendanceClaims().slice(0, 12).map(c => `<tr><td>${escapeHtml(c.volunteerName || c.volunteer_name || c.email || '-')}</td><td>${escapeHtml(c.title || c.opportunityTitle || c.opportunity_id || '-')}</td><td>${escapeHtml(c.sessionTitle || c.session_id || '-')}</td><td>${escapeHtml(c.hours || c.claimed_hours || '-')}</td><td>${badge(statusOf(c))}</td></tr>`);
    host.innerHTML = `
      <div class="phase35-page">
        <div class="phase35-summary-grid">
          ${tile('Checked in', countBy(attendanceClaims(), c => statusOf(c) === 'checked_in'))}
          ${tile('Submitted', countBy(attendanceClaims(), c => statusOf(c) === 'submitted'))}
          ${tile('Verified', countBy(attendanceClaims(), c => statusOf(c) === 'verified'))}
        </div>
        ${table('Attendance review preview', ['Volunteer', 'Opportunity', 'Session', 'Hours', 'Status'], rows)}
      </div>
    `;
    legacy(host.querySelector('.phase35-page'), ctx);
    return true;
  }

  function renderTraining(host, ctx) {
    const rows = trainings().slice(0, 10).map(t => `<tr><td><strong>${escapeHtml(t.title || t.id)}</strong><br><span class="dashboard-muted">${escapeHtml(t.sessionTitle || t.trainer || '')}</span></td><td>${escapeHtml(fmt(t.startsAt || t.date))}</td><td>${escapeHtml(t.location || '-')}</td><td>${escapeHtml(t.capacity || 'unlimited')}</td><td>${badge(t.status || 'Open')}</td></tr>`);
    host.innerHTML = `
      <div class="phase35-page">
        <div class="phase35-summary-grid">
          ${tile('Training rows', trainings().length)}
          ${tile('Training sign-ups', trainingSignups().length)}
          ${tile('Completed', countBy(trainingSignups(), t => statusOf(t) === 'completed'))}
        </div>
        ${table('Training programme/session preview', ['Training', 'Date', 'Location', 'Capacity', 'Status'], rows)}
        <div class="phase35-page-note">Canonical owner: parent training rows, child sessions, training sign-ups, completion review, and training points context.</div>
      </div>
    `;
    legacy(host.querySelector('.phase35-page'), ctx);
    return true;
  }

  function renderSimple(host, ctx, config) {
    host.innerHTML = `
      <div class="phase35-page">
        <div class="phase35-action-grid">
          ${(config.actions || []).map(action => `<article class="phase35-action-card"><strong>${escapeHtml(action[0])}</strong><span>${escapeHtml(action[1])}</span></article>`).join('')}
        </div>
        <div class="phase35-page-note">${escapeHtml(config.note || 'Existing tools remain available below until this canonical page is fully rewritten.')}</div>
      </div>
    `;
    legacy(host.querySelector('.phase35-page'), ctx);
    return true;
  }

  const RENDERERS = {
    home: renderHome,
    content: renderContent,
    opportunities: renderOpportunities,
    signups: renderSignups,
    attendance: renderAttendance,
    training: renderTraining,
    referrals: (host, ctx) => renderSimple(host, ctx, { actions: [['Referral tracking', 'Review referral codes, accepted referrals, and duplicate/self-referral prevention.'], ['Workflow status', 'Future canonical workflow should add referral status transitions and conversion review.']] }),
    points: (host, ctx) => renderSimple(host, ctx, { actions: [['Points ledger', 'Review awarded points and idempotent source records.'], ['Achievements', 'Review user achievements and future adjustment/backfill workflows.']] }),
    reports: (host, ctx) => renderSimple(host, ctx, { actions: [['Report runner', 'Run volunteer hours, attendance, opportunity, training, referral, and points reports.'], ['CSV exports', 'Export pilot-scale browser CSVs; large export controls remain production follow-up.']] }),
    audit: (host, ctx) => renderSimple(host, ctx, { actions: [['Audit search', 'Find who changed what, when, and with which metadata.'], ['Audit export', 'Export audit rows for operational review.']] }),
    notifications: (host, ctx) => renderSimple(host, ctx, { actions: [['Notification history', 'Review active and historical notifications.'], ['Preferences', 'Manage preference-aware in-app notification behaviour.']] }),
    system: (host, ctx) => renderSimple(host, ctx, { actions: [['QA smoke checks', 'Run read-only in-app checks before demos or handoff.'], ['Production readiness', 'Use Phase 32 and Phase 33 SQL verification and advisor follow-ups.']] })
  };

  function render(area, host, ctx = {}) {
    const fn = RENDERERS[area];
    if (!fn || !host) return false;
    fn(host, ctx);
    return true;
  }

  window.MENDAKIPhase35CanonicalAdminPages = { render };
})();
