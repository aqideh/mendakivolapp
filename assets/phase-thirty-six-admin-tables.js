(() => {
  if (window.__phaseThirtySixAdminTablesInstalled) return;
  window.__phaseThirtySixAdminTablesInstalled = true;

  const tableState = new Map();
  const rowCache = new Map();
  let drawerRecord = null;

  function store() { return window.VolunteerDataStore; }
  function appState() { try { return typeof state !== 'undefined' ? state : null; } catch (_) { return null; } }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }
  function asArray(value) { return Array.isArray(value) ? value : []; }
  function opportunities() { return asArray(appState()?.data?.opportunities); }
  function sessions() { return asArray(appState()?.data?.sessions); }
  function trainings() { return asArray(appState()?.data?.trainings); }
  function signups() { return asArray(store()?.getOpportunitySignups?.()); }
  function attendanceClaims() { return asArray(store()?.getAttendanceClaims?.()); }
  function trainingSignups() { return asArray(store()?.getTrainingSignups?.()); }
  function referrals() { return asArray(store()?.getReferrals?.() || store()?.getReferralRecords?.()); }
  function points() { return asArray(store()?.getPointsLedger?.()); }

  function fmt(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function statusOf(item) {
    return String(item?.status || item?.claimStatus || item?.claim_status || item?.referralStatus || item?.type || '');
  }

  function valueOf(item, keys, fallback = '-') {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
  }

  function statusBadge(status) {
    const s = String(status || 'unknown');
    const good = ['confirmed', 'registered', 'completed', 'verified', 'accepted', 'converted', 'Open', 'open'].includes(s);
    const warn = ['pending_review', 'waitlisted', 'checked_in', 'submitted', 'clarification_requested', 'pending'].includes(s);
    const bad = ['declined', 'cancelled', 'rejected', 'no_show', 'duplicate'].includes(s);
    return `<span class="phase36-status ${good ? 'good' : warn ? 'warn' : bad ? 'bad' : ''}">${escapeHtml(s)}</span>`;
  }

  function getState(id) {
    if (!tableState.has(id)) tableState.set(id, { search: '', status: '', sort: '', dir: 'asc' });
    return tableState.get(id);
  }

  function textFor(row) {
    try { return JSON.stringify(row).toLowerCase(); }
    catch (_) { return String(row?.__id || '').toLowerCase(); }
  }

  function applyFilters(id, rows) {
    const current = getState(id);
    let filtered = asArray(rows).slice();
    if (current.search) {
      const q = current.search.toLowerCase();
      filtered = filtered.filter(row => textFor(row).includes(q));
    }
    if (current.status) filtered = filtered.filter(row => statusOf(row) === current.status);
    if (current.sort) {
      const dir = current.dir === 'desc' ? -1 : 1;
      filtered.sort((a, b) => String(valueOf(a, [current.sort], '')).localeCompare(String(valueOf(b, [current.sort], ''))) * dir);
    }
    return filtered;
  }

  function statuses(rows) {
    return [...new Set(asArray(rows).map(statusOf).filter(Boolean))].sort();
  }

  function toolbar(id, rows) {
    const current = getState(id);
    return `
      <div class="phase36-toolbar">
        <label>Search<input data-phase36-search="${escapeHtml(id)}" value="${escapeHtml(current.search)}" placeholder="Search table"></label>
        <label>Status<select data-phase36-status="${escapeHtml(id)}"><option value="">Any status/type</option>${statuses(rows).map(s => `<option value="${escapeHtml(s)}" ${current.status === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}</select></label>
        <label>Sort<select data-phase36-sort="${escapeHtml(id)}"><option value="">Default order</option><option value="status" ${current.sort === 'status' ? 'selected' : ''}>Status</option><option value="createdAt" ${current.sort === 'createdAt' ? 'selected' : ''}>Created</option><option value="updatedAt" ${current.sort === 'updatedAt' ? 'selected' : ''}>Updated</option></select></label>
        <button class="button dashboard-secondary" type="button" data-phase36-reset="${escapeHtml(id)}">Reset filters</button>
      </div>
    `;
  }

  function emptyMarkup(id, safeRows) {
    const current = getState(id);
    if (safeRows.length && (current.search || current.status)) {
      return `<div class="phase36-empty">No matching records. Clear the search text or reset filters to show the ${safeRows.length} loaded record${safeRows.length === 1 ? '' : 's'}.</div>`;
    }
    return '<div class="phase36-empty">No records loaded yet. Use Refresh queue, or sign out and sign in again if this does not update.</div>';
  }

  function table(id, title, headers, rows, cells) {
    const safeRows = asArray(rows);
    const filtered = applyFilters(id, safeRows);
    rememberRows(id, filtered);
    return `
      ${toolbar(id, safeRows)}
      <section class="phase36-table-card">
        <div class="phase36-table-head"><h4>${escapeHtml(title)}</h4><span class="dashboard-muted">${filtered.length} of ${safeRows.length}</span></div>
        ${filtered.length ? `<table class="phase36-table"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${filtered.map(row => `<tr data-phase36-row="${escapeHtml(id)}" data-phase36-row-id="${escapeHtml(row.__id)}">${cells(row).join('')}</tr>`).join('')}</tbody></table>` : emptyMarkup(id, safeRows)}
      </section>
    `;
  }

  function attachFallback(host, ctx) {
    if (host && typeof ctx?.fallbackLegacyMarkup === 'function') ctx.fallbackLegacyMarkup(host, ctx.matchingCards || []);
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
      createdAt: valueOf(row, ['signedUpAt', 'signed_up_at', 'created_at', 'createdAt']),
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
      hours: valueOf(row, ['hours', 'claimedHours', 'claimed_hours', 'verifiedHours', 'verified_hours']),
      status: statusOf(row),
      createdAt: valueOf(row, ['checkInAt', 'checkedInAt', 'submittedAt', 'created_at', 'createdAt']),
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
      createdAt: valueOf(row, ['signedUpAt', 'signed_up_at', 'created_at', 'createdAt']),
      updatedAt: valueOf(row, ['updatedAt', 'updated_at']),
      raw: row
    };
  }

  function normaliseReferral(row, i) {
    const currentStatus = statusOf(row) || (valueOf(row, ['accepted_at']) !== '-' ? 'accepted' : 'pending');
    return {
      __id: row.id || row.code || row.referral_code || `referral-${i}`,
      __type: 'Referral',
      referrer: valueOf(row, ['referrerName', 'referrer_name', 'referrerEmail', 'referrer_email', 'email']),
      referred: valueOf(row, ['referredName', 'referred_name', 'referredEmail', 'referred_email', 'accepted_by_email']),
      code: valueOf(row, ['code', 'referralCode', 'referral_code']),
      status: currentStatus,
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
    host.innerHTML = `<div class="phase36-page">${table('signups', 'Opportunity sign-up review table', ['Volunteer', 'Opportunity', 'Session', 'Status', 'Submitted'], rows, row => [`<td><strong>${escapeHtml(row.volunteer)}</strong><br><span class="dashboard-muted">${escapeHtml(row.email)}</span></td>`, `<td>${escapeHtml(row.title)}</td>`, `<td>${escapeHtml(row.session)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    attachFallback(host.querySelector('.phase36-page'), ctx);
    return true;
  }

  function renderAttendance(host, ctx) {
    const rows = attendanceClaims().map(normaliseAttendance);
    host.innerHTML = `<div class="phase36-page">${table('attendance', 'Attendance review table', ['Volunteer', 'Opportunity', 'Session', 'Hours', 'Status'], rows, row => [`<td><strong>${escapeHtml(row.volunteer)}</strong><br><span class="dashboard-muted">${escapeHtml(row.email)}</span></td>`, `<td>${escapeHtml(row.title)}</td>`, `<td>${escapeHtml(row.session)}</td>`, `<td>${escapeHtml(row.hours)}</td>`, `<td>${statusBadge(row.status)}</td>`])}</div>`;
    attachFallback(host.querySelector('.phase36-page'), ctx);
    return true;
  }

  function renderTraining(host, ctx) {
    const rows = trainingSignups().map(normaliseTraining);
    const trainingRows = rows.length ? rows : trainings().map((t, i) => ({ __id: t.id || `training-${i}`, __type: 'Training programme/session', volunteer: '-', email: '', title: valueOf(t, ['title', 'id']), session: valueOf(t, ['sessionTitle', 'id']), status: valueOf(t, ['status'], 'Open'), createdAt: valueOf(t, ['startsAt', 'date']), updatedAt: valueOf(t, ['updatedAt', 'updated_at']), raw: t }));
    host.innerHTML = `<div class="phase36-page">${table('training', 'Training sign-up and session table', ['Volunteer', 'Training', 'Session', 'Status', 'Date'], trainingRows, row => [`<td>${escapeHtml(row.volunteer)}</td>`, `<td>${escapeHtml(row.title)}</td>`, `<td>${escapeHtml(row.session)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    attachFallback(host.querySelector('.phase36-page'), ctx);
    return true;
  }

  function renderReferrals(host, ctx) {
    const rows = referrals().map(normaliseReferral);
    host.innerHTML = `<div class="phase36-page">${table('referrals', 'Referral queue table', ['Code', 'Referrer', 'Referred', 'Status', 'Created'], rows, row => [`<td><code>${escapeHtml(row.code)}</code></td>`, `<td>${escapeHtml(row.referrer)}</td>`, `<td>${escapeHtml(row.referred)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    attachFallback(host.querySelector('.phase36-page'), ctx);
    return true;
  }

  function renderPoints(host, ctx) {
    const rows = points().map(normalisePoints);
    host.innerHTML = `<div class="phase36-page">${table('points', 'Points ledger table', ['User', 'Reason/source', 'Points', 'Type', 'Awarded'], rows, row => [`<td>${escapeHtml(row.user)}</td>`, `<td>${escapeHtml(row.reason)}</td>`, `<td>${escapeHtml(row.points)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    attachFallback(host.querySelector('.phase36-page'), ctx);
    return true;
  }

  function renderAudit(host, ctx) {
    const rows = [];
    host.innerHTML = `<div class="phase36-page"><div class="phase36-empty">Audit table refinement will use the existing audit RPC-backed card until the audit module exposes rows to the shared table layer.</div></div>`;
    rememberRows('audit', rows);
    attachFallback(host.querySelector('.phase36-page'), ctx);
    return true;
  }

  const registry = { signups: renderSignups, attendance: renderAttendance, training: renderTraining, referrals: renderReferrals, points: renderPoints, audit: renderAudit };

  function rememberRows(id, rows) { rowCache.set(id, asArray(rows)); }

  function renderError(area, host, error) {
    console.error(`Phase 36 ${area} render failed`, error);
    host.innerHTML = `<div class="phase36-page"><div class="phase36-empty">${escapeHtml(area)} queue could not render. ${escapeHtml(error?.message || 'Unknown render error.')}</div></div>`;
    rememberRows(area, []);
    return true;
  }

  function render(area, host, ctx) {
    const fn = registry[area];
    if (!fn || !host) return false;
    try {
      const result = fn(host, ctx || {});
      if (!host.children.length) host.innerHTML = `<div class="phase36-page"><div class="phase36-empty">${escapeHtml(area)} queue rendered no content.</div></div>`;
      return result;
    } catch (error) {
      return renderError(area, host, error);
    }
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

  function drawerActionMarkup(record) {
    if (window.MENDAKIPhase38DrawerActions?.renderActions) return window.MENDAKIPhase38DrawerActions.renderActions(record, escapeHtml) || '';
    return '<span class="dashboard-muted">Actions remain in legacy tools until row-level mutations are migrated safely.</span>';
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
      <div class="phase36-drawer-actions"><button class="button dashboard-secondary" type="button" data-phase36-close-drawer>Close</button>${drawerActionMarkup(record)}</div>
    `;
    layer.hidden = false;
  }

  function closeDrawer() {
    const layer = ensureDrawer();
    layer.hidden = true;
    drawerRecord = null;
  }

  function currentAreaFromRow(row) { return row?.getAttribute('data-phase36-row') || ''; }

  function resetFilters(id) {
    tableState.set(id, { search: '', status: '', sort: '', dir: 'asc' });
    window.MENDAKIPhase34AdminShell?.mountArea?.();
  }

  function bind() {
    if (window.__phaseThirtySixAdminTablesBound) return;
    window.__phaseThirtySixAdminTablesBound = true;
    document.addEventListener('click', event => {
      const reset = event.target.closest('[data-phase36-reset]');
      if (reset) {
        event.preventDefault();
        resetFilters(reset.dataset.phase36Reset || '');
        return;
      }

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
        const current = getState(sort.dataset.phase36Sort);
        current.sort = sort.value || '';
        current.dir = current.dir === 'asc' ? 'desc' : 'asc';
        window.MENDAKIPhase34AdminShell?.mountArea?.();
      }
    }, true);
  }

  bind();
  ensureDrawer();
  window.MENDAKIPhase36AdminTables = { render, openDrawer, closeDrawer, currentRecord: () => drawerRecord, resetFilters };
})();
