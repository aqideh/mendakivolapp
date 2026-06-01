(() => {
  if (window.__mendakiAdminToolsInstalled) return;
  window.__mendakiAdminToolsInstalled = true;

  const REPORTS = {
    hours: ['Volunteer hours', 'get_admin_volunteer_hours_report', ['date', 'opportunityId', 'status'], ['', 'verified', 'adjusted', 'submitted', 'checked_in', 'pending_submission', 'rejected']],
    attendance: ['Attendance verification', 'get_admin_attendance_verification_report', ['date', 'status'], ['', 'pending_submission', 'checked_in', 'submitted', 'verified', 'adjusted', 'clarification_requested', 'rejected']],
    participation: ['Opportunity participation', 'get_admin_participation_report', ['date', 'opportunityId', 'status'], ['', 'pending_review', 'registered', 'confirmed', 'waitlisted', 'declined', 'cancelled', 'completed']],
    trainingReport: ['Training completion', 'get_admin_training_completion_report', ['date', 'status'], ['', 'registered', 'waitlisted', 'completed', 'cancelled']],
    referrals: ['Referrals', 'get_admin_referral_report', ['date', 'status'], ['', 'accepted', 'converted', 'cancelled', 'duplicate']],
    points: ['Points and achievements', 'get_admin_points_report', ['date', 'reason'], ['', 'attendance_verified', 'training_completed', 'referral_accepted', 'admin_adjustment']]
  };

  const adminToolsState = {
    content: { type: 'news', editingId: '', rows: [], loading: false, error: '', status: '' },
    training: { editingId: '', rows: [], loading: false, error: '', status: '' },
    reports: { type: 'hours', rows: [], loading: false, error: '', filters: {} },
    audit: { rows: [], loading: false, error: '', selected: '', filters: {} },
    notifications: { rows: [], prefs: [], loading: false, error: '', status: '' },
    points: { status: '' }
  };

  function store() { return window.VolunteerDataStore; }
  function client() { return store().authState.supabase; }
  function appData() { return window.state.data; }
  function escapeHtml(value) { return store().utils.escapeHtml(value); }
  function mountArea() { window.MENDAKIAdminWorkspace.mountArea(); }
  function adminTables() { return window.MENDAKIAdminTables; }

  function fmt(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function csvCell(value) {
    const text = value == null ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value));
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function downloadCsv(filename, rows) {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const csv = [cols.join(','), ...rows.map(row => cols.map(col => csvCell(row[col])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function table(rows, empty = 'No rows loaded yet.', options = {}) {
    if (!rows.length) return `<div class="phase36-empty">${escapeHtml(empty)}</div>`;
    const cols = Object.keys(rows[0]).filter(col => !String(col).startsWith('__')).slice(0, 12);
    const rowAttr = options.rowAttr || (() => '');
    return `<section class="phase36-table-card"><div class="phase36-table-head"><h4>${escapeHtml(options.title || 'Results')}</h4><span class="dashboard-muted">${rows.length} row${rows.length === 1 ? '' : 's'}</span></div><table class="phase36-table"><thead><tr>${cols.map(col => `<th>${escapeHtml(col)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 50).map(row => `<tr ${rowAttr(row)}>${cols.map(col => `<td>${escapeHtml(row[col] == null ? '' : (typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col]))}</td>`).join('')}</tr>`).join('')}</tbody></table></section>${rows.length > 50 ? '<p class="dashboard-muted">Showing first 50 rows. Export CSV for full result.</p>' : ''}`;
  }

  function localDate(value) { return value ? String(value).slice(0, 10) : ''; }
  function appRows(name) { return appData()[name] || []; }

  async function loadContentRows(type = adminToolsState.content.type) {
    adminToolsState.content.type = type;
    adminToolsState.content.loading = true;
    adminToolsState.content.error = '';
    mountArea();
    try {
      if (type === 'news') adminToolsState.content.rows = await store().fetchSupabaseNewsItems();
      else adminToolsState.content.rows = [{ id: 'about', title: 'Static copy', note: 'Static copy editing will be enabled after the app settings content table is approved.' }];
    } catch (error) {
      adminToolsState.content.rows = [];
      adminToolsState.content.error = error.message || 'Content load failed.';
    } finally {
      adminToolsState.content.loading = false;
      mountArea();
    }
  }

  function selectedNews() { return adminToolsState.content.rows.find(row => String(row.id) === String(adminToolsState.content.editingId)) || {}; }

  function renderContentPage(host) {
    const s = adminToolsState.content;
    const item = selectedNews();
    host.innerHTML = `<div class="phase35-page" data-admin-tools-page="content"><div class="phase35-page-note">Content editor. News editing is active; static copy editing is awaiting an approved content table.</div><div class="dashboard-actions"><button class="button ${s.type === 'news' ? 'button-primary' : 'dashboard-secondary'}" type="button" data-admin-content-type="news">News</button><button class="button ${s.type === 'about' ? 'button-primary' : 'dashboard-secondary'}" type="button" data-admin-content-type="about">Static copy</button><button class="button dashboard-secondary" type="button" data-admin-content-refresh>${s.loading ? 'Loading...' : 'Refresh'}</button></div>${s.error ? `<p class="dashboard-muted error">${escapeHtml(s.error)}</p>` : ''}${s.status ? `<p class="dashboard-muted">${escapeHtml(s.status)}</p>` : ''}${s.type === 'about' ? renderStaticCopyPlaceholder() : renderNewsEditor(item)}${s.type === 'news' ? table(s.rows, 'No news rows loaded yet.', { title: 'News rows', rowAttr: row => `data-admin-content-edit="${escapeHtml(row.id)}"` }) : ''}</div>`;
    return true;
  }

  function renderStaticCopyPlaceholder() {
    return '<section class="phase36-table-card"><div class="phase36-table-head"><h4>Static copy</h4></div><div class="phase36-empty">Static copy editing needs an approved app settings or content table before write access is enabled.</div></section>';
  }

  function renderNewsEditor(item = {}) {
    return `<form class="profile-form" data-admin-news-form><input type="hidden" name="id" value="${escapeHtml(item.id || '')}"><label>Title<input name="title" required value="${escapeHtml(item.title || '')}"></label><div class="session-form-row"><label>Category<select name="category"><option ${item.category === 'Announcement' ? 'selected' : ''}>Announcement</option><option ${item.category === 'Programme' ? 'selected' : ''}>Programme</option><option ${item.category === 'Volunteer' ? 'selected' : ''}>Volunteer</option></select></label><label>Status<select name="status"><option value="published" ${item.status !== 'draft' ? 'selected' : ''}>Published</option><option value="draft" ${item.status === 'draft' ? 'selected' : ''}>Draft</option></select></label></div><div class="session-form-row"><label>Publication date<input name="date" type="date" value="${escapeHtml(localDate(item.date || item.publication_date))}"></label><label>Read time<input name="readTime" value="${escapeHtml(item.readTime || item.read_time || '')}" placeholder="2 min read"></label></div><label>Emoji<input name="emoji" value="${escapeHtml(item.emoji || '')}"></label><label class="admin-content-checkbox"><input name="featured" type="checkbox" ${item.featured ? 'checked' : ''}> Featured on home</label><label>Body<textarea name="body" rows="5">${escapeHtml(Array.isArray(item.body) ? item.body.join('\n') : '')}</textarea></label><div class="dashboard-actions"><button class="button button-primary" type="submit">${item.id ? 'Save news item' : 'Create news item'}</button><button class="button dashboard-secondary" type="button" data-admin-news-new>New item</button></div></form>`;
  }

  async function saveNews(form) {
    const formData = new FormData(form);
    const result = await store().saveSupabaseNewsItem({
      id: String(formData.get('id') || '') || undefined,
      title: String(formData.get('title') || ''),
      category: String(formData.get('category') || 'Announcement'),
      emoji: String(formData.get('emoji') || ''),
      date: String(formData.get('date') || ''),
      readTime: String(formData.get('readTime') || ''),
      featured: Boolean(formData.get('featured')),
      status: String(formData.get('status') || 'published'),
      bodyText: String(formData.get('body') || '')
    });
    adminToolsState.content.status = result.ok ? 'Saved news item.' : `Could not save news item${result.reason ? `: ${result.reason}` : '.'}`;
    adminToolsState.content.editingId = '';
    await loadContentRows('news');
  }

  async function loadTrainingRows() {
    adminToolsState.training.loading = true;
    adminToolsState.training.error = '';
    mountArea();
    try {
      await store().applySupabaseTrainingSessions();
      adminToolsState.training.rows = appRows('trainings');
    } catch (error) {
      adminToolsState.training.error = error.message || 'Training load failed.';
      adminToolsState.training.rows = appRows('trainings');
    } finally {
      adminToolsState.training.loading = false;
      mountArea();
    }
  }

  function selectedTraining() { return adminToolsState.training.rows.find(row => String(row.id) === String(adminToolsState.training.editingId)) || {}; }

  function renderTrainingPage(host) {
    const s = adminToolsState.training;
    const item = selectedTraining();
    host.innerHTML = `<div class="phase35-page" data-admin-tools-page="training"><div class="phase35-page-note">Training programme and session editor. Completion review is available from the Training queue table.</div><div class="dashboard-actions"><button class="button dashboard-secondary" type="button" data-admin-training-refresh>${s.loading ? 'Loading...' : 'Refresh training'}</button><button class="button dashboard-secondary" type="button" data-admin-training-new>New training row</button></div>${s.error ? `<p class="dashboard-muted error">${escapeHtml(s.error)}</p>` : ''}${s.status ? `<p class="dashboard-muted">${escapeHtml(s.status)}</p>` : ''}${renderTrainingEditor(item)}${table(s.rows, 'No training rows loaded yet.', { title: 'Training rows', rowAttr: row => `data-admin-training-edit="${escapeHtml(row.id)}"` })}</div>`;
    return true;
  }

  function renderTrainingEditor(item = {}) {
    return `<form class="profile-form" data-admin-training-form><label>ID<input name="id" required ${item.id ? 'readonly' : ''} value="${escapeHtml(item.id || '')}" placeholder="training-orientation-2026"></label><label>Title<input name="title" required value="${escapeHtml(item.title || '')}"></label><label>Description<textarea name="description" rows="4">${escapeHtml(item.description || '')}</textarea></label><div class="session-form-row"><label>Date<input name="date" type="date" value="${escapeHtml(localDate(item.date || item.session_date))}"></label><label>Time<input name="time" value="${escapeHtml(item.time || '')}"></label></div><div class="session-form-row"><label>Trainer<input name="trainer" value="${escapeHtml(item.trainer || '')}"></label><label>Location<input name="location" value="${escapeHtml(item.location || '')}"></label></div><div class="session-form-row"><label>Capacity<input name="capacity" type="number" min="0" value="${escapeHtml(item.capacity || 0)}"></label><label>Status<input name="status" value="${escapeHtml(item.status || 'Open')}"></label></div><label class="admin-content-checkbox"><input name="waitlistEnabled" type="checkbox" ${item.waitlistEnabled === false ? '' : 'checked'}> Enable waitlist</label><div class="dashboard-actions"><button class="button button-primary" type="submit">${item.id ? 'Save training' : 'Create training'}</button></div></form>`;
  }

  async function saveTraining(form) {
    const data = new FormData(form);
    const result = await store().saveSupabaseTrainingSession({
      id: String(data.get('id') || ''),
      title: String(data.get('title') || ''),
      description: String(data.get('description') || ''),
      date: String(data.get('date') || ''),
      time: String(data.get('time') || ''),
      trainer: String(data.get('trainer') || ''),
      location: String(data.get('location') || ''),
      capacity: Number(data.get('capacity') || 0),
      status: String(data.get('status') || 'Open'),
      waitlistEnabled: Boolean(data.get('waitlistEnabled')),
      requiredFor: []
    });
    adminToolsState.training.status = result.ok ? 'Saved training row.' : `Could not save training${result.reason ? `: ${result.reason}` : '.'}`;
    adminToolsState.training.editingId = '';
    await loadTrainingRows();
  }

  function renderReportPage(host) {
    const s = adminToolsState.reports;
    const [label, , filters, options] = REPORTS[s.type] || REPORTS.hours;
    host.innerHTML = `<div class="phase35-page" data-admin-tools-page="reports"><div class="phase35-page-note">Report runner.</div><form class="profile-form" data-admin-report-form><label>Report type<select name="type">${Object.entries(REPORTS).map(([key, value]) => `<option value="${key}" ${key === s.type ? 'selected' : ''}>${escapeHtml(value[0])}</option>`).join('')}</select></label><div class="session-form-row"><label>Start date<input name="startDate" type="date" value="${escapeHtml(s.filters.startDate || '')}"></label><label>End date<input name="endDate" type="date" value="${escapeHtml(s.filters.endDate || '')}"></label></div>${filters.includes('opportunityId') ? `<label>Opportunity ID<input name="opportunityId" value="${escapeHtml(s.filters.opportunityId || '')}" placeholder="Optional"></label>` : ''}${filters.includes('status') ? `<label>Status<select name="status">${options.map(v => `<option value="${escapeHtml(v)}" ${v === (s.filters.status || '') ? 'selected' : ''}>${escapeHtml(v || 'Any status')}</option>`).join('')}</select></label>` : ''}${filters.includes('reason') ? `<label>Reason<select name="reason">${options.map(v => `<option value="${escapeHtml(v)}" ${v === (s.filters.reason || '') ? 'selected' : ''}>${escapeHtml(v || 'Any reason')}</option>`).join('')}</select></label>` : ''}<div class="dashboard-actions"><button class="button button-primary" type="submit">${s.loading ? 'Running...' : 'Run report'}</button><button class="button dashboard-secondary" type="button" data-admin-report-export ${s.rows.length ? '' : 'disabled'}>Export CSV</button></div></form>${s.error ? `<p class="dashboard-muted error">${escapeHtml(s.error)}</p>` : ''}<p class="dashboard-muted">${escapeHtml(s.rows.length)} row${s.rows.length === 1 ? '' : 's'} loaded for ${escapeHtml(label)}.</p>${table(s.rows)}</div>`;
    return true;
  }

  async function runReport(form) {
    const data = new FormData(form);
    const type = String(data.get('type') || 'hours');
    adminToolsState.reports.type = type;
    adminToolsState.reports.filters = Object.fromEntries(data.entries());
    adminToolsState.reports.loading = true;
    adminToolsState.reports.error = '';
    mountArea();
    const [, rpc, filters] = REPORTS[type] || REPORTS.hours;
    const args = {};
    if (filters.includes('date')) { args.p_start_date = adminToolsState.reports.filters.startDate || null; args.p_end_date = adminToolsState.reports.filters.endDate || null; }
    if (filters.includes('opportunityId')) args.p_opportunity_id = adminToolsState.reports.filters.opportunityId || null;
    if (filters.includes('status')) args.p_status = adminToolsState.reports.filters.status || null;
    if (filters.includes('reason')) args.p_reason = adminToolsState.reports.filters.reason || null;
    try {
      const { data: rows, error } = await client().rpc(rpc, args);
      if (error) throw error;
      adminToolsState.reports.rows = Array.isArray(rows) ? rows : [];
    } catch (error) {
      adminToolsState.reports.rows = [];
      adminToolsState.reports.error = error.message || 'Report failed.';
    } finally {
      adminToolsState.reports.loading = false;
      mountArea();
    }
  }

  function renderAuditPage(host) {
    const s = adminToolsState.audit;
    const selected = s.rows.find(row => String(row.id) === String(s.selected));
    host.innerHTML = `<div class="phase35-page" data-admin-tools-page="audit"><div class="phase35-page-note">Audit search with row detail inspection.</div><form class="profile-form" data-admin-audit-form><div class="session-form-row"><label>Start date<input name="startDate" type="date" value="${escapeHtml(s.filters.startDate || '')}"></label><label>End date<input name="endDate" type="date" value="${escapeHtml(s.filters.endDate || '')}"></label></div><div class="session-form-row"><label>Action<input name="actionType" value="${escapeHtml(s.filters.actionType || '')}" placeholder="Optional action type"></label><label>Entity<input name="entityType" value="${escapeHtml(s.filters.entityType || '')}" placeholder="Optional entity type"></label></div><div class="session-form-row"><label>Actor<input name="actor" value="${escapeHtml(s.filters.actor || '')}" placeholder="Optional actor email"></label><label>Target<input name="target" value="${escapeHtml(s.filters.target || '')}" placeholder="Optional target email"></label></div><label>Limit<select name="limit"><option value="50">50</option><option value="100" ${String(s.filters.limit || '100') === '100' ? 'selected' : ''}>100</option><option value="250">250</option></select></label><div class="dashboard-actions"><button class="button button-primary" type="submit">${s.loading ? 'Searching...' : 'Search audit'}</button><button class="button dashboard-secondary" type="button" data-admin-audit-export ${s.rows.length ? '' : 'disabled'}>Export CSV</button></div></form>${s.error ? `<p class="dashboard-muted error">${escapeHtml(s.error)}</p>` : ''}<div class="audit-history-grid"><div>${table(s.rows, 'No audit rows loaded yet.', { title: 'Audit rows', rowAttr: row => `data-admin-audit-select="${escapeHtml(row.id)}"` })}</div><aside class="audit-details"><h3>Details</h3>${selected ? `<pre class="audit-metadata">${escapeHtml(JSON.stringify(selected, null, 2))}</pre>` : '<p class="dashboard-muted">Select an audit row to inspect details.</p>'}</aside></div></div>`;
    return true;
  }

  async function runAudit(form) {
    adminToolsState.audit.filters = Object.fromEntries(new FormData(form).entries());
    adminToolsState.audit.loading = true;
    adminToolsState.audit.error = '';
    mountArea();
    const f = adminToolsState.audit.filters;
    try {
      const { data, error } = await client().rpc('get_admin_audit_logs', { p_start_date: f.startDate || null, p_end_date: f.endDate || null, p_action_type: f.actionType || null, p_actor: f.actor || null, p_entity_type: f.entityType || null, p_target: f.target || null, p_limit: Number(f.limit || 100) });
      if (error) throw error;
      adminToolsState.audit.rows = Array.isArray(data) ? data : [];
    } catch (error) {
      adminToolsState.audit.rows = [];
      adminToolsState.audit.error = error.message || 'Audit search failed.';
    } finally {
      adminToolsState.audit.loading = false;
      mountArea();
    }
  }

  async function loadNotifications() {
    adminToolsState.notifications.loading = true;
    adminToolsState.notifications.error = '';
    mountArea();
    try {
      const [notif, prefs] = await Promise.all([
        client().from('app_notifications').select('*').order('created_at', { ascending: false }).limit(100),
        client().from('app_notification_preferences').select('*').limit(100)
      ]);
      if (notif.error) throw notif.error;
      if (prefs.error && prefs.error.code !== '42P01') throw prefs.error;
      adminToolsState.notifications.rows = Array.isArray(notif.data) ? notif.data : [];
      adminToolsState.notifications.prefs = Array.isArray(prefs.data) ? prefs.data : [];
    } catch (error) {
      adminToolsState.notifications.rows = [];
      adminToolsState.notifications.error = error.message || 'Notification load failed.';
    } finally {
      adminToolsState.notifications.loading = false;
      mountArea();
    }
  }

  function renderNotificationsPage(host) {
    const s = adminToolsState.notifications;
    host.innerHTML = `<div class="phase35-page" data-admin-tools-page="notifications"><div class="phase35-page-note">Notification history and preference visibility. Preference changes remain read-only until policy is confirmed.</div><div class="dashboard-actions"><button class="button button-primary" type="button" data-admin-notifications-load>${s.loading ? 'Loading...' : 'Refresh notifications'}</button></div>${s.status ? `<p class="dashboard-muted">${escapeHtml(s.status)}</p>` : ''}${s.error ? `<p class="dashboard-muted error">${escapeHtml(s.error)}</p>` : ''}${table(s.rows, 'No notification rows loaded yet.', { title: 'Notification history' })}${table(s.prefs, 'No preference rows loaded yet.', { title: 'Notification preferences' })}</div>`;
    return true;
  }

  function renderPointsPage(host) {
    host.innerHTML = `<div class="phase35-page" data-admin-tools-page="points-policy"><div class="phase35-page-note">Manual points adjustment remains policy-gated.</div><section class="phase36-table-card"><div class="phase36-table-head"><h4>Points adjustment workflow</h4></div><div class="phase36-empty">No manual adjustment form is exposed yet. Required before enablement: policy approval, reason codes, approver metadata, audit event contract, and rollback procedure.</div></section>${adminToolsState.points.status ? `<p class="dashboard-muted">${escapeHtml(adminToolsState.points.status)}</p>` : ''}</div>`;
    adminTables().render('points', host);
    return true;
  }

  function renderSystemPage(host) {
    host.innerHTML = `<div class="phase35-page" data-admin-tools-page="system"><div class="phase35-action-grid"><article class="phase35-action-card"><strong>SQL validation</strong><span>Run the database validation checks before release.</span></article><article class="phase35-action-card"><strong>Browser smoke</strong><span>Run the admin browser smoke checks before release.</span></article><article class="phase35-action-card"><strong>Admin queues</strong><span>Verify sign-up, attendance, and training queues have current data.</span></article><article class="phase35-action-card"><strong>Release gate</strong><span>Complete manual QA before publishing a production build.</span></article></div></div>`;
    const page = host.querySelector('[data-admin-tools-page="system"]');
    window.MENDAKISessionAttendanceValidation.renderInto(page);
    window.MENDAKISessionAttendanceValidation.sync({ render: true });
    return true;
  }

  function render(area, host) {
    if (area === 'content') return renderContentPage(host);
    if (area === 'training') return renderTrainingPage(host);
    if (area === 'reports') return renderReportPage(host);
    if (area === 'audit') return renderAuditPage(host);
    if (area === 'notifications') return renderNotificationsPage(host);
    if (area === 'points') return renderPointsPage(host);
    if (area === 'system') return renderSystemPage(host);
    return false;
  }

  document.addEventListener('submit', event => {
    const news = event.target.closest('[data-admin-news-form]'); if (news) { event.preventDefault(); saveNews(news); return; }
    const training = event.target.closest('[data-admin-training-form]'); if (training) { event.preventDefault(); saveTraining(training); return; }
    const report = event.target.closest('[data-admin-report-form]'); if (report) { event.preventDefault(); runReport(report); return; }
    const audit = event.target.closest('[data-admin-audit-form]'); if (audit) { event.preventDefault(); runAudit(audit); }
  }, true);

  document.addEventListener('click', event => {
    const contentType = event.target.closest('[data-admin-content-type]'); if (contentType) { adminToolsState.content.editingId = ''; loadContentRows(contentType.dataset.adminContentType); return; }
    if (event.target.closest('[data-admin-content-refresh]')) { loadContentRows(); return; }
    const contentEdit = event.target.closest('[data-admin-content-edit]'); if (contentEdit) { adminToolsState.content.editingId = contentEdit.dataset.adminContentEdit || ''; mountArea(); return; }
    if (event.target.closest('[data-admin-news-new]')) { adminToolsState.content.editingId = ''; mountArea(); return; }
    if (event.target.closest('[data-admin-training-refresh]')) { loadTrainingRows(); return; }
    if (event.target.closest('[data-admin-training-new]')) { adminToolsState.training.editingId = ''; mountArea(); return; }
    const trainingEdit = event.target.closest('[data-admin-training-edit]'); if (trainingEdit) { adminToolsState.training.editingId = trainingEdit.dataset.adminTrainingEdit || ''; mountArea(); return; }
    if (event.target.closest('[data-admin-report-export]')) downloadCsv(`mendaki-${adminToolsState.reports.type}-report-${new Date().toISOString().slice(0, 10)}.csv`, adminToolsState.reports.rows);
    if (event.target.closest('[data-admin-audit-export]')) downloadCsv(`mendaki-audit-${new Date().toISOString().slice(0, 10)}.csv`, adminToolsState.audit.rows);
    const auditSelect = event.target.closest('[data-admin-audit-select]'); if (auditSelect) { adminToolsState.audit.selected = auditSelect.dataset.adminAuditSelect || ''; mountArea(); return; }
    if (event.target.closest('[data-admin-notifications-load]')) loadNotifications();
  }, true);

  window.MENDAKIAdminTools = { render, runReport, runAudit, loadNotifications, loadContentRows, loadTrainingRows };
})();
