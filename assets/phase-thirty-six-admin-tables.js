(() => {
  if (window.__phaseThirtySixAdminTablesInstalled) return;
  window.__phaseThirtySixAdminTablesInstalled = true;

  const tableState = new Map();
  let drawerRecord = null;

  function store() { return window.VolunteerDataStore; }
  function appState() { try { return typeof state !== 'undefined' ? state : null; } catch (_) { return null; } }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }
  function opportunities() { return appState()?.data?.opportunities || []; }
  function sessions() { return appState()?.data?.sessions || []; }
  function trainings() { return appState()?.data?.trainings || []; }
  function signups() { return store()?.getOpportunitySignups?.() || []; }
  function attendanceClaims() { return store()?.getAttendanceClaims?.() || []; }
  function trainingSignups() { return store()?.getTrainingSignups?.() || []; }
  function referrals() { return store()?.getReferrals?.() || store()?.getReferralRecords?.() || []; }
  function points() { return store()?.getPointsLedger?.() || []; }

  function fmt(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function statusOf(item) { return String(item.status || item.claimStatus || item.claim_status || item.referralStatus || item.type || ''); }
  function valueOf(item, keys, fallback = '-') {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function statusBadge(status) {
    const s = String(status || 'unknown');
    const good = ['confirmed', 'registered', 'completed', 'verified', 'accepted', 'Open', 'open'].includes(s);
    const warn = ['pending_review', 'waitlisted', 'checked_in', 'submitted', 'clarification_requested', 'pending'].includes(s);
    const bad = ['declined', 'cancelled', 'rejected', 'no_show'].includes(s);
    return `<span class="phase36-status ${good ? 'good' : warn ? 'warn' : bad ? 'bad' : ''}">${escapeHtml(s)}</span>`;
  }

  function getState(id) {
    if (!tableState.has(id)) tableState.set(id, { search: '', status: '', sort: '', dir: 'asc' });
    return tableState.get(id);
  }

  function textFor(row) { return JSON.stringify(row).toLowerCase(); }

  function applyFilters(id, rows) {
    const state = getState(id);
    let filtered = rows.slice();
    if (state.search) {
      const q = state.search.toLowerCase();
      filtered = filtered.filter(row => textFor(row).includes(q));
    }
    if (state.status) filtered = filtered.filter(row => statusOf(row) === state.status);
    if (state.sort) {
      const dir = state.dir === 'desc' ? -1 : 1;
      filtered.sort((a, b) => String(valueOf(a, [state.sort], '')).localeCompare(String(valueOf(b, [state.sort], ''))) * dir);
    }
    return filtered;
  }

  function statuses(rows) {
    return [...new Set(rows.map(statusOf).filter(Boolean))].sort();
  }

  function toolbar(id, rows) {
    const state = getState(id);
    return `
      <div class="phase36-toolbar">
        <label>Search<input data-phase36-search="${escapeHtml(id)}" value="${escapeHtml(state.search)}" placeholder="Search table"></label>
        <label>Status<select data-phase36-status="${escapeHtml(id)}"><option value="">Any status/type</option>${statuses(rows).map(s => `<option value="${escapeHtml(s)}" ${state.status === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}</select></label>
        <label>Sort<select data-phase36-sort="${escapeHtml(id)}"><option value="">Default order</option><option value="status" ${state.sort === 'status' ? 'selected' : ''}>Status</option><option value="createdAt" ${state.sort === 'createdAt' ? 'selected' : ''}>Created</option><option value="updatedAt" ${state.sort === 'updatedAt' ? 'selected' : ''}>Updated</option></select></label>
      </div>
    `;
  }

  function table(id, title, headers, rows, cells) {
    const filtered = applyFilters(id, rows);
    return `
      ${toolbar(id, rows)}
      <section class="phase36-table-card">
        <div class="phase36-table-head"><h4>${escapeHtml(title)}</h4><span class="dashboard-muted">${filtered.length} of ${rows.length}</span></div>
        ${filtered.length ? `<table class="phase36-table"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${filtered.map(row => `<tr data-phase36-row="${escapeHtml(id)}" data-phase36-row-id="${escapeHtml(row.__id)}">${cells(row).join('')}</tr>`).join('')}</tbody></table>` : `<div class="phase36-empty">No matching records.</div>`}
      </section>
    `;
  }

  function normaliseSignup(row, i) {
    return {
      __id: row.id || `signup-${i}`,
      __type: 'Opportunity sign-up',
      volunteer: valueOf(row, ['volunteerName', 'volunteer_name', 'name', 'email']),
      email: valueOf(row, ['email']),
      title: valueOf(row, ['title', 'opportunityTitle', 'opportunity_id', 'opportunityId']),
      session: valueOf(row, ['sessionTitle', 'session_id', 'sessionId']),
      status: statusOf(row),
      createdAt: valueOf(row, ['signedUpAt', 'created_at', 'createdAt']),
      updatedAt: valueOf(row, ['updatedAt', 'updated_at']),
      raw: row
    };
  }

  function normaliseAttendance(row, i) {
    return {
      __id: row.id || `attendance-${i}`,
      __type: 'Attendance claim',
      volunteer: valueOf(row, ['volunteerName', 'volunteer_name', 'name', 'email']),
      email: valueOf(row, ['email']),
      title: valueOf(row, ['title', 'opportunityTitle', 'opportunity_id', 'opportunityId']),
      session: valueOf(row, ['sessionTitle', 'session_id', 'sessionId']),
      hours: valueOf(row, ['hours', 'claimed_hours', 'verified_hours']),
      status: statusOf(row),
      createdAt: valueOf(row, ['checkedInAt', 'submittedAt', 'created_at', 'createdAt']),
      updatedAt: valueOf(row, ['updatedAt', 'updated_at']),
      raw: row
    };
  }

  function normaliseTraining(row, i) {
    return {
      __id: row.id || `training-signup-${i}`,
      __type: 'Training sign-up',
      volunteer: valueOf(row, ['volunteerName', 'volunteer_name', 'name', 'email']),
      email: valueOf(row, ['email']),
      title: valueOf(row, ['title', 'trainingTitle', 'training_id', 'trainingId']),
      session: valueOf(row, ['sessionTitle', 'trainingSessionId', 'training_session_id']),
      status: statusOf(row),
      createdAt: valueOf(row, ['signedUpAt', 'created_at', 'createdAt']),
      updatedAt: valueOf(row, ['updatedAt', 'updated_at']),
      raw: row
    };
  }

  function normaliseReferral(row, i) {
    return {
      __id: row.id || row.code || `referral-${i}`,
      __type: 'Referral',
      referrer: valueOf(row, ['referrerEmail', 'referrer_email', 'email']),
      referred: valueOf(row, ['referredEmail', 'referred_email', 'accepted_by_email']),
      code: valueOf(row, ['code', 'referralCode', 'referral_code']),
      status: statusOf(row) || valueOf(row, ['accepted_at']) !== '-' ? 'accepted' : 'pending',
      createdAt: valueOf(row, ['createdAt', 'created_at', 'accepted_at']),
      updatedAt: valueOf(row, ['updatedAt', 'updated_at']),
      raw: row
    };
  }

  function normalisePoints(row, i) {
    return {
      __id: row.id || `points-${i}`,
      __type: 'Points ledger entry',
      user: valueOf(row, ['email', 'userEmail', 'user_id', 'app_user_id']),
      reason: valueOf(row, ['reason', 'source_type', 'event_type']),
      points: valueOf(row, ['points', 'amount']),
      status: valueOf(row, ['source_type', 'reason', 'status'], 'points'),
      createdAt: valueOf(row, ['createdAt', 'created_at', 'awarded_at']),
      updatedAt: valueOf(row, ['updatedAt', 'updated_at']),
      raw: row
    };
  }

  function renderSignups(host, ctx) {
    const rows = signups().map(normaliseSignup);
    host.innerHTML = `<div class="phase36-page">${table('Opportunity sign-up review table', ['Volunteer', 'Opportunity', 'Session', 'Status', 'Submitted'], rows, row => [`<td><strong>${escapeHtml(row.volunteer)}</strong><br><span class="dashboard-muted">${escapeHtml(row.email)}</span></td>`, `<td>${escapeHtml(row.title)}</td>`, `<td>${escapeHtml(row.session)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    ctx?.fallbackLegacyMarkup?.(host.querySelector('.phase36-page'), ctx.matchingCards || []);
    rememberRows('signups', rows);
    return true;
  }

  function renderAttendance(host, ctx) {
    const rows = attendanceClaims().map(normaliseAttendance);
    host.innerHTML = `<div class="phase36-page">${table('Attendance review table', ['Volunteer', 'Opportunity', 'Session', 'Hours', 'Status'], rows, row => [`<td><strong>${escapeHtml(row.volunteer)}</strong><br><span class="dashboard-muted">${escapeHtml(row.email)}</span></td>`, `<td>${escapeHtml(row.title)}</td>`, `<td>${escapeHtml(row.session)}</td>`, `<td>${escapeHtml(row.hours)}</td>`, `<td>${statusBadge(row.status)}</td>`])}</div>`;
    ctx?.fallbackLegacyMarkup?.(host.querySelector('.phase36-page'), ctx.matchingCards || []);
    rememberRows('attendance', rows);
    return true;
  }

  function renderTraining(host, ctx) {
    const rows = trainingSignups().map(normaliseTraining);
    const trainingRows = rows.length ? rows : trainings().map((t, i) => ({ __id: t.id || `training-${i}`, __type: 'Training programme/session', volunteer: '-', email: '', title: valueOf(t, ['title', 'id']), session: valueOf(t, ['sessionTitle', 'id']), status: valueOf(t, ['status'], 'Open'), createdAt: valueOf(t, ['startsAt', 'date']), updatedAt: valueOf(t, ['updatedAt', 'updated_at']), raw: t }));
    host.innerHTML = `<div class="phase36-page">${table('Training sign-up and session table', ['Volunteer', 'Training', 'Session', 'Status', 'Date'], trainingRows, row => [`<td>${escapeHtml(row.volunteer)}</td>`, `<td>${escapeHtml(row.title)}</td>`, `<td>${escapeHtml(row.session)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    ctx?.fallbackLegacyMarkup?.(host.querySelector('.phase36-page'), ctx.matchingCards || []);
    rememberRows('training', trainingRows);
    return true;
  }

  function renderReferrals(host, ctx) {
    const rows = referrals().map(normaliseReferral);
    host.innerHTML = `<div class="phase36-page">${table('Referral queue table', ['Code', 'Referrer', 'Referred', 'Status', 'Created'], rows, row => [`<td><code>${escapeHtml(row.code)}</code></td>`, `<td>${escapeHtml(row.referrer)}</td>`, `<td>${escapeHtml(row.referred)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    ctx?.fallbackLegacyMarkup?.(host.querySelector('.phase36-page'), ctx.matchingCards || []);
    rememberRows('referrals', rows);
    return true;
  }

  function renderPoints(host, ctx) {
    const rows = points().map(normalisePoints);
    host.innerHTML = `<div class="phase36-page">${table('Points ledger table', ['User', 'Reason/source', 'Points', 'Type', 'Awarded'], rows, row => [`<td>${escapeHtml(row.user)}</td>`, `<td>${escapeHtml(row.reason)}</td>`, `<td>${escapeHtml(row.points)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    ctx?.fallbackLegacyMarkup?.(host.querySelector('.phase36-page'), ctx.matchingCards || []);
    rememberRows('points', rows);
    return true;
  }

  function renderAudit(host, ctx) {
    const rows = [];
    host.innerHTML = `<div class="phase36-page"><div class="phase36-empty">Audit table refinement will use the existing audit RPC-backed card until the audit module exposes rows to the shared table layer.</div></div>`;
    ctx?.fallbackLegacyMarkup?.(host.querySelector('.phase36-page'), ctx.matchingCards || []);
    rememberRows('audit', rows);
    return true;
  }

  const registry = { signups: renderSignups, attendance: renderAttendance, training: renderTraining, referrals: renderReferrals, points: renderPoints, audit: renderAudit };
  const rowCache = new Map();

  function rememberRows(id, rows) { rowCache.set(id, rows); }

  function render(area, host, ctx) {
    const fn = registry[area];
    if (!fn) return false;
    return fn(host, ctx);
  }

  function ensureDrawer() {
    let layer = document.querySelector('[data-phase36-drawer-layer]');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'phase36-drawer-layer';
    layer.dataset.phase36DrawerLayer = 'true';
    layer.hidden = true;
    layer.innerHTML = '<aside class="phase36-drawer" role="dialog" aria-modal="true" aria-labelledby="phase36-drawer-title"></aside>';
    document.body.appendChild(layer);
    return layer;
  }

  function openDrawer(record) {
    drawerRecord = record;
    const layer = ensureDrawer();
    const drawer = layer.querySelector('.phase36-drawer');
    const raw = record.raw || {};
    const details = { ...record, raw: undefined };
    drawer.innerHTML = `
      <div class="phase36-drawer-header">
        <div><p class="eyebrow dark">${escapeHtml(record.__type || 'Record')}</p><h3 id="phase36-drawer-title">${escapeHtml(record.title || record.volunteer || record.__id)}</h3></div>
        <button class="close-button" type="button" data-phase36-close-drawer aria-label="Close detail drawer">×</button>
      </div>
      <div class="phase36-detail-grid">
        ${Object.entries(details).filter(([k]) => !k.startsWith('__')).map(([key, value]) => `<div class="phase36-detail-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}
        <div class="phase36-detail-row"><span>Raw record</span><code>${escapeHtml(JSON.stringify(raw, null, 2))}</code></div>
      </div>
      <div class="phase36-drawer-actions"><button class="button dashboard-secondary" type="button" data-phase36-close-drawer>Close</button><span class="dashboard-muted">Actions remain in legacy tools until row-level mutations are migrated safely.</span></div>
    `;
    layer.hidden = false;
  }

  function closeDrawer() {
    const layer = ensureDrawer();
    layer.hidden = true;
    drawerRecord = null;
  }

  function currentAreaFromRow(row) { return row?.getAttribute('data-phase36-row') || ''; }

  function bind() {
    if (window.__phaseThirtySixAdminTablesBound) return;
    window.__phaseThirtySixAdminTablesBound = true;
    document.addEventListener('click', event => {
      const close = event.target.closest('[data-phase36-close-drawer]');
      if (close || event.target.matches('[data-phase36-drawer-layer]')) {
        closeDrawer();
        return;
      }
      const row = event.target.closest('[data-phase36-row]');
      if (row) {
        const area = currentAreaFromRow(row);
        const id = row.getAttribute('data-phase36-row-id');
        const record = (rowCache.get(area) || []).find(item => String(item.__id) === String(id));
        if (record) openDrawer(record);
        return;
      }
    }, true);

    document.addEventListener('input', event => {
      const input = event.target.closest('[data-phase36-search]');
      if (!input) return;
      getState(input.dataset.phase36Search).search = input.value || '';
      window.MENDAKIPhase34AdminShell?.mountArea?.();
    }, true);

    document.addEventListener('change', event => {
      const status = event.target.closest('[data-phase36-status]');
      if (status) {
        getState(status.dataset.phase36Status).status = status.value || '';
        window.MENDAKIPhase34AdminShell?.mountArea?.();
        return;
      }
      const sort = event.target.closest('[data-phase36-sort]');
      if (sort) {
        const state = getState(sort.dataset.phase36Sort);
        state.sort = sort.value || '';
        state.dir = state.dir === 'asc' ? 'desc' : 'asc';
        window.MENDAKIPhase34AdminShell?.mountArea?.();
      }
    }, true);
  }

  bind();
  ensureDrawer();
  window.MENDAKIPhase36AdminTables = { render, openDrawer, closeDrawer };
})();
