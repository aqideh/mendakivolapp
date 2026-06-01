(() => {
  if (window.__mendakiAdminUxInstalled) return;
  window.__mendakiAdminUxInstalled = true;

  const state = {
    selectedTrainingId: '',
    editingSessionId: '',
    trainingRows: [],
    busy: false,
    host: null
  };

  function store() { return window.VolunteerDataStore; }
  function dataAccess() { return window.MENDAKIDataAccess; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }

  function formatDate(value) {
    if (!value) return 'Date unset';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(parsed);
  }

  function dateTimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function dateTimeLocalToIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  function parentTrainingRows() {
    const seen = new Set();
    return state.trainingRows.filter(row => {
      const parent = row.parent_training_id || row.id;
      const isParent = row.id === parent || row.is_session_instance !== true;
      if (!isParent || seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
  }

  function sessionsForTraining(id) {
    return state.trainingRows
      .filter(row => row.id === id || row.parent_training_id === id)
      .sort((a, b) => String(a.starts_at || a.session_date || '').localeCompare(String(b.starts_at || b.session_date || '')));
  }

  async function fetchTrainingRows() {
    if (!dataAccess()?.fetchAdminTrainingSessions || !isAdmin()) return [];
    const rows = await dataAccess().fetchAdminTrainingSessions();
    state.trainingRows = Array.isArray(rows) ? rows : [];
    return state.trainingRows;
  }

  function trainingManagerMarkup() {
    const selected = state.selectedTrainingId || parentTrainingRows()[0]?.id || '';
    state.selectedTrainingId = selected;
    const parent = state.trainingRows.find(row => row.id === selected) || {};
    const editing = state.trainingRows.find(row => row.id === state.editingSessionId) || null;
    return `
      <section class="phase31-training-card" data-admin-training-manager>
        <div class="section-header">
          <div>
            <p class="eyebrow dark">Admin · Training</p>
            <h2>Training session management</h2>
            <p class="dashboard-muted">Manage parent training opportunities and child session instances from the primary admin workspace.</p>
          </div>
          <button class="text-button" type="button" data-admin-training-refresh>${state.busy ? 'Loading...' : 'Refresh'}</button>
        </div>
        <div class="phase31-training-grid">
          <div class="phase31-training-list">
            ${parentTrainingRows().length ? parentTrainingRows().map(renderTrainingParent).join('') : '<div class="signup-empty">No training rows loaded.</div>'}
          </div>
          <div>
            <h3>${escapeHtml(parent.title || 'Select a training')}</h3>
            <p class="dashboard-muted">${escapeHtml(parent.description || 'Choose a parent training row, then create or edit dated child sessions.')}</p>
            ${selected ? renderTrainingSessionForm(parent, editing) : ''}
          </div>
        </div>
        <div class="phase31-training-status" data-admin-training-status></div>
      </section>
    `;
  }

  function renderTrainingParent(row) {
    const sessions = sessionsForTraining(row.id);
    return `
      <article class="phase31-training-parent ${state.selectedTrainingId === row.id ? 'active' : ''}" data-admin-parent-training="${escapeHtml(row.id)}">
        <header>
          <div>
            <h3>${escapeHtml(row.title || row.id)}</h3>
            <p class="dashboard-muted">${escapeHtml(row.id)} · ${escapeHtml(row.status || 'Open')}</p>
          </div>
          <span class="badge ${row.status === 'Open' ? 'badge-open' : 'badge-ad-hoc'}">${escapeHtml(row.status || 'Open')}</span>
        </header>
        <div class="phase31-training-actions">
          <button class="button dashboard-secondary" type="button" data-admin-select-training="${escapeHtml(row.id)}">Manage sessions</button>
          <button class="button dashboard-secondary" type="button" data-admin-new-training-session="${escapeHtml(row.id)}">New session</button>
        </div>
        <div class="phase31-training-session-list">
          ${sessions.map(session => renderTrainingSessionItem(row, session)).join('')}
        </div>
      </article>
    `;
  }

  function renderTrainingSessionItem(parent, session) {
    const label = session.id === parent.id && session.is_session_instance !== true ? 'Default session' : (session.session_title || session.title || 'Session');
    return `
      <div class="phase31-training-session-item">
        <strong>${escapeHtml(label)}</strong>
        <span class="dashboard-muted">${escapeHtml(formatDate(session.starts_at || session.session_date))} · ${escapeHtml(session.time || 'Time unset')} · Capacity ${escapeHtml(session.capacity || 'unlimited')}</span>
        <div class="phase31-training-session-actions">
          <button class="text-button" type="button" data-admin-edit-training-session="${escapeHtml(session.id)}" data-parent-training="${escapeHtml(parent.id)}">Edit</button>
          ${session.id !== parent.id ? `<button class="text-button" type="button" data-admin-delete-training-session="${escapeHtml(session.id)}">Delete</button>` : ''}
        </div>
      </div>
    `;
  }

  function renderTrainingSessionForm(parent, session) {
    const isEditing = Boolean(session?.id);
    const isChild = isEditing && session.id !== parent.id;
    return `
      <form class="phase31-training-form" data-admin-training-session-form>
        <input type="hidden" name="id" value="${escapeHtml(session?.id || '')}">
        <input type="hidden" name="parentTrainingId" value="${escapeHtml(parent.id || '')}">
        <label>Session title<input name="sessionTitle" value="${escapeHtml(session?.session_title || session?.title || '')}" placeholder="e.g. Orientation Session 1"></label>
        <div class="phase31-training-form-row">
          <label>Starts at<input name="startsAt" type="datetime-local" value="${escapeHtml(dateTimeLocal(session?.starts_at))}"></label>
          <label>Ends at<input name="endsAt" type="datetime-local" value="${escapeHtml(dateTimeLocal(session?.ends_at))}"></label>
        </div>
        <div class="phase31-training-form-row">
          <label>Date fallback<input name="sessionDate" type="date" value="${escapeHtml(session?.session_date || '')}"></label>
          <label>Time label<input name="time" value="${escapeHtml(session?.time || parent.time || '')}" placeholder="10:00 AM - 12:00 PM"></label>
        </div>
        <div class="phase31-training-form-row">
          <label>Capacity<input name="capacity" type="number" min="0" value="${escapeHtml(session?.capacity ?? parent.capacity ?? 0)}"></label>
          <label>Default hours<input name="defaultHours" type="number" min="0" step="0.25" value="${escapeHtml(session?.default_hours || 0)}"></label>
        </div>
        <div class="phase31-training-form-row">
          <label>Status<select name="status"><option ${String(session?.status || parent.status || 'Open') === 'Open' ? 'selected' : ''}>Open</option><option ${session?.status === 'Closed' ? 'selected' : ''}>Closed</option><option ${session?.status === 'Draft' ? 'selected' : ''}>Draft</option></select></label>
          <label>Trainer<input name="trainer" value="${escapeHtml(session?.trainer || parent.trainer || '')}"></label>
        </div>
        <label>Location<input name="location" value="${escapeHtml(session?.location || parent.location || '')}"></label>
        <label>Description<textarea name="description">${escapeHtml(isChild ? (session?.description || '') : (parent.description || ''))}</textarea></label>
        <label><span><input name="waitlistEnabled" type="checkbox" ${session?.waitlist_enabled === false ? '' : 'checked'}> Enable waitlist</span></label>
        <div class="phase31-training-actions">
          <button class="button button-primary" type="submit">${isEditing ? 'Save session' : 'Create session'}</button>
          <button class="button dashboard-secondary" type="button" data-admin-new-training-session="${escapeHtml(parent.id || '')}">New session</button>
        </div>
      </form>
    `;
  }

  function setTrainingStatus(text) {
    const node = state.host?.querySelector?.('[data-admin-training-status]') || document.querySelector('[data-admin-training-status]');
    if (node) node.textContent = text || '';
  }

  function sessionRowFromForm(form) {
    const data = new FormData(form);
    const parentId = String(data.get('parentTrainingId') || '').trim();
    const parent = state.trainingRows.find(row => row.id === parentId) || {};
    const id = String(data.get('id') || '').trim() || crypto.randomUUID();
    const sessionTitle = String(data.get('sessionTitle') || '').trim();
    const startsAt = dateTimeLocalToIso(String(data.get('startsAt') || ''));
    const endsAt = dateTimeLocalToIso(String(data.get('endsAt') || ''));
    return {
      id,
      parent_training_id: parentId,
      title: parent.title || sessionTitle || 'Training',
      session_title: sessionTitle || parent.title || 'Training session',
      description: String(data.get('description') || '').trim() || parent.description || '',
      trainer: String(data.get('trainer') || '').trim() || null,
      session_date: String(data.get('sessionDate') || '').trim() || (startsAt ? startsAt.slice(0, 10) : null),
      time: String(data.get('time') || '').trim(),
      location: String(data.get('location') || '').trim(),
      capacity: Number(data.get('capacity') || 0),
      waitlist_enabled: Boolean(data.get('waitlistEnabled')),
      status: String(data.get('status') || 'Open'),
      required_for: Array.isArray(parent.required_for) ? parent.required_for : [],
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      default_hours: Number(data.get('defaultHours') || 0),
      is_session_instance: id !== parentId,
      source: 'app',
      updated_at: new Date().toISOString()
    };
  }

  async function saveTrainingSession(form) {
    if (!dataAccess()?.saveAdminTrainingSession || !isAdmin()) return;
    const row = sessionRowFromForm(form);
    if (row.starts_at && row.ends_at && new Date(row.ends_at) < new Date(row.starts_at)) {
      setTrainingStatus('End time cannot be before start time.');
      return;
    }
    state.busy = true;
    setTrainingStatus('Saving...');
    const result = await dataAccess().saveAdminTrainingSession(row);
    state.busy = false;
    if (!result.ok) {
      setTrainingStatus(`Could not save: ${result.reason || 'Unknown error.'}`);
      return;
    }
    state.editingSessionId = row.id;
    await fetchTrainingRows();
    renderTrainingManager();
    setTrainingStatus('Saved.');
  }

  async function deleteTrainingSession(id) {
    if (!dataAccess()?.deleteAdminTrainingSession || !isAdmin()) return;
    if (!window.confirm('Delete this training session? Existing sign-ups may keep historical references.')) return;
    const result = await dataAccess().deleteAdminTrainingSession(id);
    if (!result.ok) {
      window.alert(`Could not delete training session: ${result.reason || 'Unknown error.'}`);
      return;
    }
    state.editingSessionId = '';
    await fetchTrainingRows();
    renderTrainingManager();
  }

  async function renderTrainingManager(host = state.host) {
    if (!host || !isAdmin()) return false;
    state.host = host;
    if (!state.trainingRows.length) await fetchTrainingRows();
    host.innerHTML = trainingManagerMarkup();
    return true;
  }

  async function renderTrainingManagerInto(host) {
    return renderTrainingManager(host);
  }

  function bind() {
    if (window.__mendakiAdminUxBound) return;
    window.__mendakiAdminUxBound = true;
    document.addEventListener('click', async event => {
      const selectTraining = event.target.closest('[data-admin-select-training]');
      if (selectTraining) { state.selectedTrainingId = selectTraining.dataset.adminSelectTraining || ''; state.editingSessionId = ''; renderTrainingManager(); return; }
      const newSession = event.target.closest('[data-admin-new-training-session]');
      if (newSession) { state.selectedTrainingId = newSession.dataset.adminNewTrainingSession || state.selectedTrainingId; state.editingSessionId = ''; renderTrainingManager(); return; }
      const editSession = event.target.closest('[data-admin-edit-training-session]');
      if (editSession) { state.selectedTrainingId = editSession.dataset.parentTraining || state.selectedTrainingId; state.editingSessionId = editSession.dataset.adminEditTrainingSession || ''; renderTrainingManager(); return; }
      const deleteSession = event.target.closest('[data-admin-delete-training-session]');
      if (deleteSession) { await deleteTrainingSession(deleteSession.dataset.adminDeleteTrainingSession); return; }
      if (event.target.closest('[data-admin-training-refresh]')) { await fetchTrainingRows(); renderTrainingManager(); }
    }, true);

    document.addEventListener('submit', event => {
      const form = event.target.closest('[data-admin-training-session-form]');
      if (!form) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      saveTrainingSession(form);
    }, true);
  }

  function install() {
    bind();
  }

  window.MENDAKIAdminUX = { install, renderTrainingManager, renderTrainingManagerInto, fetchTrainingRows };

  document.addEventListener('DOMContentLoaded', install);
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', install);
  window.addEventListener('volunteer-training-sessions-synced', () => {
    fetchTrainingRows().then(() => renderTrainingManager());
  });
})();
