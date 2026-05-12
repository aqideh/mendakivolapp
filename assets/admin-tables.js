(() => {
  if (window.__mendakiAdminTablesInstalled) return;
  window.__mendakiAdminTablesInstalled = true;

  const tableState = new Map();
  const rowCache = new Map();
  let drawerRecord = null;

  function store() { return window.VolunteerDataStore; }
  function dataAccess() { return window.MENDAKIDataAccess; }
  function appData() { return window.state.data; }
  function escapeHtml(value) { return store().utils.escapeHtml(value); }
  function asArray(value) { return Array.isArray(value) ? value : []; }
  function signups() { return dataAccess().listOpportunitySignups(); }
  function attendanceClaims() { return dataAccess().listAttendanceClaims(); }
  function trainingSignups() { return dataAccess().listTrainingSignups(); }
  function trainings() { return asArray(appData().trainings); }
  function referrals() { return typeof store().getReferrals === 'function' ? asArray(store().getReferrals()) : []; }
  function points() { return typeof store().getPointsLedger === 'function' ? asArray(store().getPointsLedger()) : []; }

  function fmt(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function statusOf(item) { return String(item.status || item.claimStatus || item.referralStatus || item.type || ''); }
  function valueOf(item, keys, empty = '-') {
    for (const key of keys) {
      const value = item[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return empty;
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

  function snapshotFor(id) {
    const domain = id === 'signups' ? 'opportunitySignups' : id === 'attendance' ? 'attendanceClaims' : id;
    return dataAccess().snapshot(domain);
  }

  function textFor(row) { return JSON.stringify(row).toLowerCase(); }
  function applyFilters(id, rows) {
    const current = getState(id);
    let filtered = asArray(rows).slice();
    if (current.search) filtered = filtered.filter(row => textFor(row).includes(current.search.toLowerCase()));
    if (current.status) filtered = filtered.filter(row => statusOf(row) === current.status);
    if (current.sort) {
      const dir = current.dir === 'desc' ? -1 : 1;
      filtered.sort((a, b) => String(valueOf(a, [current.sort], '')).localeCompare(String(valueOf(b, [current.sort], ''))) * dir);
    }
    return filtered;
  }

  function statuses(rows) { return [...new Set(asArray(rows).map(statusOf).filter(Boolean))].sort(); }

  function toolbar(id, rows) {
    const current = getState(id);
    const snap = snapshotFor(id);
    const refreshed = snap.lastRefreshedAt ? `Last refreshed ${fmt(snap.lastRefreshedAt)}` : 'Not refreshed this session';
    return `
      <div class="phase36-toolbar">
        <label>Search<input data-admin-table-search="${escapeHtml(id)}" value="${escapeHtml(current.search)}" placeholder="Search table"></label>
        <label>Status<select data-admin-table-status="${escapeHtml(id)}"><option value="">Any status/type</option>${statuses(rows).map(s => `<option value="${escapeHtml(s)}" ${current.status === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}</select></label>
        <label>Sort<select data-admin-table-sort="${escapeHtml(id)}"><option value="">Default order</option><option value="status" ${current.sort === 'status' ? 'selected' : ''}>Status</option><option value="createdAt" ${current.sort === 'createdAt' ? 'selected' : ''}>Created</option><option value="updatedAt" ${current.sort === 'updatedAt' ? 'selected' : ''}>Updated</option></select></label>
        <div class="phase36-toolbar-actions">
          <button class="button dashboard-secondary" type="button" data-admin-table-reset="${escapeHtml(id)}">Reset filters</button>
          <button class="button dashboard-secondary" type="button" data-admin-table-refresh="${escapeHtml(id)}" ${snap.loading ? 'disabled' : ''}>${snap.loading ? 'Refreshing...' : 'Refresh queue'}</button>
          <span class="dashboard-muted">${escapeHtml(refreshed)}</span>
        </div>
      </div>`;
  }

  function emptyMarkup(id, rows) {
    const snap = snapshotFor(id);
    const current = getState(id);
    if (snap.error) return `<div class="phase36-empty" data-variant="error">Could not refresh queue: ${escapeHtml(snap.error)}</div>`;
    if (snap.loading) return '<div class="phase36-empty">Refreshing queue records...</div>';
    if (rows.length && (current.search || current.status)) return `<div class="phase36-empty">No matching records. Reset filters to show the ${rows.length} loaded record${rows.length === 1 ? '' : 's'}.</div>`;
    return '<div class="phase36-empty">No records loaded yet. Use Refresh queue to load current records.</div>';
  }

  function table(id, title, headers, rows, cells) {
    const allRows = asArray(rows);
    const filtered = applyFilters(id, allRows);
    rowCache.set(id, filtered);
    return `${toolbar(id, allRows)}<section class="phase36-table-card"><div class="phase36-table-head"><h4>${escapeHtml(title)}</h4><span class="dashboard-muted">${filtered.length} of ${allRows.length}</span></div>${filtered.length ? `<table class="phase36-table"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${filtered.map(row => `<tr data-admin-table-row="${escapeHtml(id)}" data-admin-table-row-id="${escapeHtml(row.__id)}">${cells(row).join('')}</tr>`).join('')}</tbody></table>` : emptyMarkup(id, allRows)}</section>`;
  }

  function normaliseSignup(row, i) {
    return { __id: row.id || `signup-${i}`, __type: 'Opportunity sign-up', volunteer: valueOf(row, ['volunteerName', 'volunteer_name', 'name', 'email']), email: valueOf(row, ['email']), title: valueOf(row, ['title', 'opportunityTitle', 'opportunityId']), session: valueOf(row, ['sessionTitle', 'sessionId']), status: statusOf(row), createdAt: valueOf(row, ['signedUpAt', 'createdAt']), updatedAt: valueOf(row, ['updatedAt']), raw: row };
  }

  function normaliseAttendance(row, i) {
    return { __id: row.id || `attendance-${i}`, __type: 'Attendance claim', volunteer: valueOf(row, ['volunteerName', 'volunteer_name', 'name', 'email']), email: valueOf(row, ['email']), title: valueOf(row, ['title', 'opportunityTitle', 'opportunityId']), session: valueOf(row, ['sessionTitle', 'sessionId']), hours: valueOf(row, ['claimedHours', 'verifiedHours', 'hours']), status: statusOf(row), clarificationResponse: valueOf(row, ['clarificationResponse'], ''), createdAt: valueOf(row, ['checkInAt', 'submittedAt', 'createdAt']), updatedAt: valueOf(row, ['updatedAt']), raw: row };
  }

  function normaliseTraining(row, i) {
    return { __id: row.id || `training-signup-${i}`, __type: 'Training sign-up', volunteer: valueOf(row, ['volunteerName', 'volunteer_name', 'name', 'email']), email: valueOf(row, ['email']), title: valueOf(row, ['title', 'trainingTitle', 'trainingId']), session: valueOf(row, ['sessionTitle', 'trainingSessionId']), status: statusOf(row), createdAt: valueOf(row, ['signedUpAt', 'createdAt']), updatedAt: valueOf(row, ['updatedAt']), raw: row };
  }

  function normaliseReferral(row, i) {
    return { __id: row.id || row.code || `referral-${i}`, __type: 'Referral', referrer: valueOf(row, ['referrerName', 'referrer_email', 'email']), referred: valueOf(row, ['referredName', 'referred_email', 'accepted_by_email']), code: valueOf(row, ['code', 'referralCode', 'referral_code']), status: statusOf(row) || 'pending', createdAt: valueOf(row, ['createdAt', 'created_at', 'accepted_at']), updatedAt: valueOf(row, ['updatedAt', 'updated_at']), raw: row };
  }

  function normalisePoints(row, i) {
    return { __id: row.id || `points-${i}`, __type: 'Points ledger entry', user: valueOf(row, ['email', 'userEmail', 'user_id', 'app_user_id']), reason: valueOf(row, ['reason', 'source_type', 'event_type']), points: valueOf(row, ['points', 'amount']), status: valueOf(row, ['source_type', 'reason', 'status'], 'points'), createdAt: valueOf(row, ['createdAt', 'created_at', 'awarded_at']), updatedAt: valueOf(row, ['updatedAt', 'updated_at']), raw: row };
  }

  function renderSignups(host) {
    const rows = signups().map(normaliseSignup);
    host.innerHTML = `<div class="phase36-page">${table('signups', 'Opportunity sign-up review table', ['Volunteer', 'Opportunity', 'Session', 'Status', 'Submitted'], rows, row => [`<td><strong>${escapeHtml(row.volunteer)}</strong><br><span class="dashboard-muted">${escapeHtml(row.email)}</span></td>`, `<td>${escapeHtml(row.title)}</td>`, `<td>${escapeHtml(row.session)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    return true;
  }

  function renderAttendance(host) {
    const rows = attendanceClaims().map(normaliseAttendance);
    host.innerHTML = `<div class="phase36-page">${table('attendance', 'Attendance review table', ['Volunteer', 'Opportunity', 'Session', 'Hours', 'Status'], rows, row => [`<td><strong>${escapeHtml(row.volunteer)}</strong><br><span class="dashboard-muted">${escapeHtml(row.email)}</span></td>`, `<td>${escapeHtml(row.title)}${row.clarificationResponse ? '<br><span class="dashboard-muted">Volunteer responded to clarification</span>' : ''}</td>`, `<td>${escapeHtml(row.session)}</td>`, `<td>${escapeHtml(row.hours)}</td>`, `<td>${statusBadge(row.status)}</td>`])}</div>`;
    return true;
  }

  function renderTraining(host) {
    const rows = trainingSignups().map(normaliseTraining);
    const currentRows = rows.length ? rows : trainings().map((t, i) => ({ __id: t.id || `training-${i}`, __type: 'Training programme/session', volunteer: '-', email: '', title: valueOf(t, ['title', 'id']), session: valueOf(t, ['sessionTitle', 'id']), status: valueOf(t, ['status'], 'Open'), createdAt: valueOf(t, ['startsAt', 'date']), updatedAt: valueOf(t, ['updatedAt']), raw: t }));
    host.innerHTML = `<div class="phase36-page">${table('training', 'Training sign-up and session table', ['Volunteer', 'Training', 'Session', 'Status', 'Date'], currentRows, row => [`<td>${escapeHtml(row.volunteer)}</td>`, `<td>${escapeHtml(row.title)}</td>`, `<td>${escapeHtml(row.session)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    return true;
  }

  function renderReferrals(host) {
    const rows = referrals().map(normaliseReferral);
    host.innerHTML = `<div class="phase36-page">${table('referrals', 'Referral queue table', ['Code', 'Referrer', 'Referred', 'Status', 'Created'], rows, row => [`<td><code>${escapeHtml(row.code)}</code></td>`, `<td>${escapeHtml(row.referrer)}</td>`, `<td>${escapeHtml(row.referred)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    return true;
  }

  function renderPoints(host) {
    const rows = points().map(normalisePoints);
    host.innerHTML = `<div class="phase36-page">${table('points', 'Points ledger table', ['User', 'Reason/source', 'Points', 'Type', 'Awarded'], rows, row => [`<td>${escapeHtml(row.user)}</td>`, `<td>${escapeHtml(row.reason)}</td>`, `<td>${escapeHtml(row.points)}</td>`, `<td>${statusBadge(row.status)}</td>`, `<td>${escapeHtml(fmt(row.createdAt))}</td>`])}</div>`;
    return true;
  }

  function renderAudit(host) {
    rowCache.set('audit', []);
    host.innerHTML = '<div class="phase36-page"><div class="phase36-empty">Use the Audit page search to load audit rows.</div></div>';
    return true;
  }

  const registry = { signups: renderSignups, attendance: renderAttendance, training: renderTraining, referrals: renderReferrals, points: renderPoints, audit: renderAudit };

  function render(area, host) {
    const fn = registry[area];
    if (!fn || !host) return false;
    try { return fn(host); }
    catch (error) {
      console.error(`Admin table ${area} render failed`, error);
      host.innerHTML = `<div class="phase36-page"><div class="phase36-empty">${escapeHtml(area)} queue could not render. ${escapeHtml(error.message || 'Unknown render error.')}</div></div>`;
      rowCache.set(area, []);
      return true;
    }
  }

  function ensureDrawer() {
    let layer = document.querySelector('[data-admin-table-drawer-layer]');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'phase36-drawer-layer';
    layer.dataset.adminTableDrawerLayer = 'true';
    layer.hidden = true;
    layer.innerHTML = '<aside class="phase36-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-table-drawer-title"></aside>';
    document.body.appendChild(layer);
    return layer;
  }

  function drawerActionMarkup(record) {
    return window.MENDAKIPhase38DrawerActions.renderActions(record, escapeHtml) || '';
  }

  function openDrawer(record) {
    drawerRecord = record;
    const layer = ensureDrawer();
    const drawer = layer.querySelector('.phase36-drawer');
    const details = { ...record, raw: undefined };
    drawer.innerHTML = `<div class="phase36-drawer-header"><div><p class="eyebrow dark">${escapeHtml(record.__type || 'Record')}</p><h3 id="admin-table-drawer-title">${escapeHtml(record.title || record.volunteer || record.__id)}</h3></div><button class="close-button" type="button" data-admin-table-close-drawer aria-label="Close detail drawer">×</button></div><div class="phase36-detail-grid">${Object.entries(details).filter(([key, value]) => !key.startsWith('__') && key !== 'raw' && value !== undefined && value !== '').map(([key, value]) => `<div class="phase36-detail-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div><div class="phase36-drawer-actions"><button class="button dashboard-secondary" type="button" data-admin-table-close-drawer>Close</button>${drawerActionMarkup(record)}</div>`;
    layer.hidden = false;
  }

  function closeDrawer() {
    ensureDrawer().hidden = true;
    drawerRecord = null;
  }

  function mountArea() { window.MENDAKIPhase34AdminShell.mountArea(); }
  function resetFilters(id) { tableState.set(id, { search: '', status: '', sort: '', dir: 'asc' }); mountArea(); }
  async function refreshQueue(id) { await dataAccess().refreshAdminQueue(id, { force: true }); mountArea(); }

  function bind() {
    document.addEventListener('click', event => {
      const refresh = event.target.closest('[data-admin-table-refresh]');
      if (refresh) { event.preventDefault(); refreshQueue(refresh.dataset.adminTableRefresh).catch(error => console.warn('Could not refresh admin queue.', error)); return; }
      const reset = event.target.closest('[data-admin-table-reset]');
      if (reset) { event.preventDefault(); resetFilters(reset.dataset.adminTableReset); return; }
      const close = event.target.closest('[data-admin-table-close-drawer]');
      if (close || event.target.matches('[data-admin-table-drawer-layer]')) { closeDrawer(); return; }
      const row = event.target.closest('[data-admin-table-row]');
      if (row) {
        const area = row.dataset.adminTableRow;
        const id = row.dataset.adminTableRowId;
        const record = (rowCache.get(area) || []).find(item => String(item.__id) === String(id));
        if (record) openDrawer(record);
      }
    }, true);

    document.addEventListener('input', event => {
      const input = event.target.closest('[data-admin-table-search]');
      if (!input) return;
      getState(input.dataset.adminTableSearch).search = input.value || '';
      mountArea();
    }, true);

    document.addEventListener('change', event => {
      const status = event.target.closest('[data-admin-table-status]');
      if (status) { getState(status.dataset.adminTableStatus).status = status.value || ''; mountArea(); return; }
      const sort = event.target.closest('[data-admin-table-sort]');
      if (sort) {
        const current = getState(sort.dataset.adminTableSort);
        current.sort = sort.value || '';
        current.dir = current.dir === 'asc' ? 'desc' : 'asc';
        mountArea();
      }
    }, true);

    window.addEventListener('mendaki-data-access-state', mountArea);
  }

  bind();
  ensureDrawer();
  window.MENDAKIAdminTables = Object.freeze({ render, openDrawer, closeDrawer, currentRecord: () => drawerRecord, resetFilters, refreshQueue });
})();
