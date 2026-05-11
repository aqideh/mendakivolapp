(() => {
  if (window.__phaseThirtyTrainingSessionParityInstalled) return;
  window.__phaseThirtyTrainingSessionParityInstalled = true;

  const stateCache = {
    sessionsByTraining: new Map(),
    syncing: false
  };

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function currentSession() { return store()?.getSession?.() || null; }
  function ready() { return Boolean(client() && currentSession()?.email); }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }
  function appState() {
    try { return typeof state !== 'undefined' ? state : null; } catch (_) { return null; }
  }

  function formatDate(value) {
    if (!value) return 'Date to be confirmed';
    const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  function rowToTraining(row) {
    return {
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      trainer: row.trainer || '',
      date: row.session_date || '',
      time: row.time || '',
      location: row.location || '',
      capacity: Number(row.capacity || 0),
      waitlistEnabled: row.waitlist_enabled !== false,
      status: row.status || 'Open',
      requiredFor: Array.isArray(row.required_for) ? row.required_for : [],
      parentTrainingId: row.parent_training_id || row.id,
      sessionTitle: row.session_title || row.title || '',
      startsAt: row.starts_at || '',
      endsAt: row.ends_at || '',
      defaultHours: Number(row.default_hours || 0),
      isSessionInstance: row.is_session_instance === true
    };
  }

  function rowToSignup(row) {
    return {
      id: row.id,
      trainingId: String(row.training_id || ''),
      trainingSessionId: row.training_session_id || row.training_id || '',
      sessionTitle: row.session_title || row.title || '',
      appUserId: row.volunteer_user_id || '',
      email: row.email || '',
      volunteerName: row.volunteer_name || 'Volunteer',
      title: row.title || '',
      date: row.session_date || '',
      time: row.time || '',
      location: row.location || '',
      trainer: row.trainer || '',
      status: row.status || 'registered',
      signedUpAt: row.signed_up_at || '',
      completedAt: row.completed_at || '',
      completedSessionAt: row.completed_session_at || '',
      cancelledAt: row.cancelled_at || '',
      reviewedBy: row.reviewed_by_email || '',
      reviewedAt: row.reviewed_at || '',
      adminNotes: row.admin_notes || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function groupedSessions(rows) {
    const map = new Map();
    rows.forEach(row => {
      const item = rowToTraining(row);
      const parent = item.parentTrainingId || item.id;
      if (!map.has(parent)) map.set(parent, []);
      map.get(parent).push(item);
    });
    map.forEach(list => list.sort((a, b) => String(a.startsAt || a.date || '').localeCompare(String(b.startsAt || b.date || ''))));
    return map;
  }

  async function fetchTrainingSessions() {
    const supabase = client();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('app_training_sessions')
      .select('id, title, description, trainer, session_date, time, location, capacity, waitlist_enabled, status, required_for, parent_training_id, session_title, starts_at, ends_at, default_hours, is_session_instance')
      .order('parent_training_id', { ascending: true })
      .order('starts_at', { ascending: true, nullsFirst: false })
      .order('session_date', { ascending: true, nullsFirst: false });
    if (error) {
      console.warn('Could not load Phase 30 training sessions.', error);
      return [];
    }
    return Array.isArray(data) ? data : [];
  }

  function applyTrainingCatalog(rows) {
    const currentState = appState();
    const grouped = groupedSessions(rows);
    stateCache.sessionsByTraining = grouped;

    if (!currentState?.data) return;
    const parents = rows
      .map(rowToTraining)
      .filter(item => !item.isSessionInstance || item.id === item.parentTrainingId);
    const deduped = [];
    const seen = new Set();
    parents.forEach(item => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      deduped.push({ ...item, sessionCount: grouped.get(item.id)?.length || 1 });
    });
    if (deduped.length) currentState.data.trainings = deduped;
  }

  async function syncTrainingSessions() {
    if (stateCache.syncing) return;
    stateCache.syncing = true;
    try {
      const rows = await fetchTrainingSessions();
      applyTrainingCatalog(rows);
      decorateTrainingCards();
      if (typeof phaseFourRender === 'function') phaseFourRender();
      decorateTrainingCards();
      window.dispatchEvent(new CustomEvent('volunteer-training-sessions-synced'));
    } finally {
      stateCache.syncing = false;
    }
  }

  function sessionsForTraining(trainingId) {
    return stateCache.sessionsByTraining.get(String(trainingId)) || [];
  }

  function selectedSessionId(trainingId) {
    const select = document.querySelector(`[data-training-session-select][data-training-id="${CSS.escape(String(trainingId))}"]`);
    return select?.value || sessionsForTraining(trainingId)[0]?.id || String(trainingId);
  }

  function activeSignupForTraining(trainingId) {
    const email = store()?.currentEmail?.() || '';
    return (store()?.getTrainingSignups?.() || []).find(item =>
      item.email === email &&
      String(item.trainingId) === String(trainingId) &&
      !['cancelled', 'declined', 'no_show'].includes(String(item.status || ''))
    );
  }

  function renderSessionOption(session) {
    const labelParts = [
      session.sessionTitle || session.title || 'Training session',
      formatDate(session.startsAt || session.date),
      session.time || '',
      session.location || ''
    ].filter(Boolean);
    return `<option value="${escapeHtml(session.id)}">${escapeHtml(labelParts.join(' · '))}</option>`;
  }

  function decorateTrainingCards() {
    document.querySelectorAll('.training-card').forEach(card => {
      const signupButton = card.querySelector('[data-signup-training]');
      const cancelButton = card.querySelector('[data-cancel-training]');
      const trainingId = signupButton?.dataset.signupTraining || cancelButton?.dataset.cancelTraining || '';
      if (!trainingId || card.querySelector('[data-training-session-picker]')) return;
      const sessions = sessionsForTraining(trainingId);
      if (!sessions.length) return;
      const meta = card.querySelector('.training-meta');
      if (!meta) return;
      const activeSignup = activeSignupForTraining(trainingId);
      const selected = activeSignup?.trainingSessionId || sessions[0].id;
      const picker = document.createElement('label');
      picker.className = 'training-session-picker';
      picker.dataset.trainingSessionPicker = 'true';
      picker.innerHTML = `
        <span>Training session</span>
        <select data-training-session-select data-training-id="${escapeHtml(trainingId)}" ${activeSignup ? 'disabled' : ''}>
          ${sessions.map(renderSessionOption).join('')}
        </select>
      `;
      const select = picker.querySelector('select');
      if (select) select.value = selected;
      meta.insertAdjacentElement('afterend', picker);
    });
  }

  function setBusy(button, busy, label = 'Saving...') {
    if (!button) return;
    if (busy) {
      button.dataset.phase30OriginalText = button.textContent || '';
      button.disabled = true;
      button.textContent = label;
    } else {
      button.disabled = false;
      if (button.dataset.phase30OriginalText) button.textContent = button.dataset.phase30OriginalText;
      delete button.dataset.phase30OriginalText;
    }
  }

  function upsertLocalSignup(saved) {
    const signups = store()?.getTrainingSignups?.() || [];
    const index = signups.findIndex(item => item.id === saved.id || (
      item.email === saved.email &&
      String(item.trainingId) === String(saved.trainingId) &&
      String(item.trainingSessionId || '') === String(saved.trainingSessionId || '')
    ));
    if (index >= 0) signups[index] = saved;
    else signups.push(saved);
    store()?.saveTrainingSignups?.(signups);
    window.dispatchEvent(new CustomEvent('volunteer-training-signups-synced'));
  }

  async function refreshTrainingSignups() {
    const supabase = client();
    if (!supabase || !currentSession()?.email) return [];
    const { data, error } = await supabase.from('app_training_signups').select('*').order('updated_at', { ascending: false });
    if (error) {
      console.warn('Could not refresh Phase 30 training signups.', error);
      return store()?.getTrainingSignups?.() || [];
    }
    const signups = Array.isArray(data) ? data.map(rowToSignup) : [];
    store()?.saveTrainingSignups?.(signups);
    window.dispatchEvent(new CustomEvent('volunteer-training-signups-synced'));
    return signups;
  }

  async function createSessionSignup(trainingId, trainingSessionId, button) {
    const supabase = client();
    const userSession = currentSession();
    if (!supabase || !userSession?.email) {
      if (typeof phaseOneOpenAuth === 'function') phaseOneOpenAuth();
      return;
    }
    setBusy(button, true, 'Signing up...');
    const { data, error } = await supabase.rpc('create_training_session_signup_with_capacity', {
      p_signup_id: crypto.randomUUID(),
      p_training_id: String(trainingId),
      p_training_session_id: String(trainingSessionId || trainingId),
      p_volunteer_name: userSession.name || 'Volunteer'
    });
    setBusy(button, false);
    if (error) {
      window.alert(`Could not sign up for this training session: ${error.message}`);
      return;
    }
    upsertLocalSignup(rowToSignup(data));
    await refreshTrainingSignups().catch(() => null);
    if (typeof phaseFourRender === 'function') phaseFourRender();
    decorateTrainingCards();
  }

  document.addEventListener('click', event => {
    const signupButton = event.target.closest('[data-signup-training]');
    if (!signupButton || !ready()) return;
    const trainingId = signupButton.dataset.signupTraining;
    const sessions = sessionsForTraining(trainingId);
    if (!sessions.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    createSessionSignup(trainingId, selectedSessionId(trainingId), signupButton);
  }, true);

  Object.assign(window.VolunteerDataStore || {}, {
    fetchPhaseThirtyTrainingSessions: fetchTrainingSessions,
    syncPhaseThirtyTrainingSessions: syncTrainingSessions,
    refreshPhaseThirtyTrainingSignups: refreshTrainingSignups,
    getTrainingSessionsForTraining: sessionsForTraining
  });

  document.addEventListener('DOMContentLoaded', () => {
    window.setTimeout(syncTrainingSessions, 400);
    window.setTimeout(decorateTrainingCards, 700);
  });
  window.addEventListener('volunteer-auth-ready', syncTrainingSessions);
  window.addEventListener('volunteer-auth-changed', syncTrainingSessions);
  window.addEventListener('volunteer-training-sessions-synced', decorateTrainingCards);
  window.addEventListener('volunteer-training-signups-synced', decorateTrainingCards);
})();
