(() => {
  const TRAINING_TABLE = 'app_training_sessions';
  const SIGNUP_TABLE = 'app_training_signups';

  function client() {
    return window.VolunteerDataStore?.authState?.supabase || null;
  }

  function session() {
    return window.VolunteerDataStore?.getSession?.() || null;
  }

  function appState() {
    try {
      return typeof state !== 'undefined' ? state : null;
    } catch (error) {
      return null;
    }
  }

  function isReady() {
    return Boolean(client() && session()?.email);
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
      requiredFor: Array.isArray(row.required_for) ? row.required_for : []
    };
  }

  function trainingToRow(training) {
    return {
      id: String(training.id),
      title: training.title || '',
      description: training.description || '',
      trainer: training.trainer || null,
      session_date: training.date || null,
      time: training.time || '',
      location: training.location || '',
      capacity: Number(training.capacity || 0),
      waitlist_enabled: training.waitlistEnabled !== false,
      status: training.status || 'Open',
      required_for: Array.isArray(training.requiredFor) ? training.requiredFor : [],
      source: 'app',
      updated_at: new Date().toISOString()
    };
  }

  function rowToSignup(row) {
    return {
      id: row.id,
      trainingId: String(row.training_id || ''),
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
      cancelledAt: row.cancelled_at || '',
      reviewedBy: row.reviewed_by_email || '',
      reviewedAt: row.reviewed_at || '',
      adminNotes: row.admin_notes || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function signupToRow(signup) {
    const current = session() || {};
    const now = new Date().toISOString();
    return {
      id: signup.id,
      training_id: String(signup.trainingId || ''),
      volunteer_user_id: signup.appUserId || current.appUserId || null,
      email: signup.email || current.email || '',
      volunteer_name: signup.volunteerName || current.name || 'Volunteer',
      title: signup.title || '',
      session_date: signup.date || null,
      time: signup.time || '',
      location: signup.location || '',
      trainer: signup.trainer || null,
      status: signup.status || 'registered',
      signed_up_at: signup.signedUpAt || now,
      completed_at: signup.completedAt || null,
      cancelled_at: signup.cancelledAt || null,
      reviewed_by_email: signup.reviewedBy || null,
      reviewed_at: signup.reviewedAt || null,
      admin_notes: signup.adminNotes || null,
      updated_at: signup.updatedAt || now
    };
  }

  async function fetchSupabaseTrainingSessions() {
    const supabase = client();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from(TRAINING_TABLE)
      .select('id, title, description, trainer, session_date, time, location, capacity, waitlist_enabled, status, required_for')
      .order('session_date', { ascending: true });

    if (error) {
      console.warn('Could not load Supabase training sessions; using CMS fallback.', error);
      return [];
    }

    return Array.isArray(data) ? data.map(rowToTraining) : [];
  }

  async function applySupabaseTrainingSessions() {
    const currentState = appState();
    if (!currentState?.data) return { ok: false, skipped: true };

    const trainings = await fetchSupabaseTrainingSessions();
    if (!trainings.length) return { ok: false, count: 0 };

    currentState.data.trainings = trainings;
    if (typeof phaseFourRender === 'function') phaseFourRender();
    window.dispatchEvent(new CustomEvent('volunteer-training-sessions-synced'));
    return { ok: true, count: trainings.length };
  }

  async function syncTrainingSessionsToSupabase(trainings = []) {
    const supabase = client();
    if (!supabase || !window.VolunteerDataStore?.isAdmin?.() || !Array.isArray(trainings) || !trainings.length) {
      return { ok: false, skipped: true };
    }

    const { error } = await supabase
      .from(TRAINING_TABLE)
      .upsert(trainings.map(trainingToRow), { onConflict: 'id' });

    if (error) {
      console.warn('Could not sync training sessions to Supabase.', error);
      return { ok: false, reason: error.message };
    }
    return { ok: true, count: trainings.length };
  }

  async function fetchSupabaseTrainingSignups() {
    const supabase = client();
    if (!supabase || !session()?.email) return [];

    const { data, error } = await supabase
      .from(SIGNUP_TABLE)
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Could not load Supabase training sign-ups; keeping local fallback.', error);
      return window.VolunteerDataStore.getTrainingSignups();
    }

    const signups = Array.isArray(data) ? data.map(rowToSignup) : [];
    window.VolunteerDataStore.saveTrainingSignups(signups);
    window.dispatchEvent(new CustomEvent('volunteer-training-signups-synced'));
    return signups;
  }

  async function notifySavedTrainingSignup(saved, previousStatus = '') {
    if (previousStatus === saved?.status) return;
    if (saved?.status !== 'completed') return;
    if (typeof window.VolunteerDataStore?.notifyTrainingCompletion !== 'function') return;
    await window.VolunteerDataStore.notifyTrainingCompletion(saved);
  }

  async function createSupabaseTrainingSignupWithCapacity(signup) {
    const supabase = client();
    if (!supabase || !session()?.email || !signup?.trainingId) return { ok: false, skipped: true };

    const { data, error } = await supabase.rpc('create_training_signup_with_capacity', {
      p_signup_id: signup.id || null,
      p_training_id: String(signup.trainingId),
      p_volunteer_name: signup.volunteerName || session()?.name || 'Volunteer'
    });

    if (error) {
      console.warn('Capacity-aware training signup unavailable; falling back to direct training signup save.', error);
      return { ok: false, reason: error.message, fallback: true };
    }

    const saved = rowToSignup(data);
    const signups = window.VolunteerDataStore.getTrainingSignups();
    const index = signups.findIndex(item => item.id === saved.id || (item.email === saved.email && String(item.trainingId) === String(saved.trainingId)));
    if (index >= 0) signups[index] = saved;
    else signups.push(saved);
    window.VolunteerDataStore.saveTrainingSignups(signups);
    window.dispatchEvent(new CustomEvent('volunteer-training-signups-synced'));
    return { ok: true, signup: saved, lifecycleAware: true };
  }

  async function reviewSupabaseTrainingSignupLifecycle(signup, previousStatus = '') {
    const supabase = client();
    if (!supabase || !session()?.email || !signup?.id || !window.VolunteerDataStore?.isAdmin?.()) return { ok: false, skipped: true };
    if (!['registered', 'waitlisted', 'completed', 'cancelled', 'declined', 'no_show'].includes(signup.status)) return { ok: false, skipped: true };

    const { data, error } = await supabase.rpc('review_training_signup_lifecycle', {
      p_signup_id: signup.id,
      p_status: signup.status,
      p_admin_notes: signup.adminNotes || null
    });

    if (error) {
      console.warn('Training lifecycle review unavailable; falling back to direct training signup save.', error);
      return { ok: false, reason: error.message, fallback: true };
    }

    const saved = rowToSignup(data);
    const signups = window.VolunteerDataStore.getTrainingSignups();
    const index = signups.findIndex(item => item.id === saved.id);
    if (index >= 0) signups[index] = saved;
    else signups.push(saved);
    window.VolunteerDataStore.saveTrainingSignups(signups);
    window.dispatchEvent(new CustomEvent('volunteer-training-signups-synced'));
    if (typeof window.VolunteerDataStore?.fetchNotifications === 'function') await window.VolunteerDataStore.fetchNotifications();
    await notifySavedTrainingSignup(saved, previousStatus);
    return { ok: true, signup: saved, lifecycleAware: true };
  }

  async function saveSupabaseTrainingSignup(signup, options = {}) {
    const supabase = client();
    if (!supabase || !session()?.email || !signup?.id) return { ok: false, skipped: true };

    const existing = window.VolunteerDataStore.getTrainingSignups().find(item => item.id === signup.id);
    const previousStatus = options.previousStatus || existing?.status || '';

    if (options.capacityCreate === true) {
      const capacityResult = await createSupabaseTrainingSignupWithCapacity(signup);
      if (capacityResult.ok) return capacityResult;
    }

    if (options.lifecycleReview === true) {
      const reviewResult = await reviewSupabaseTrainingSignupLifecycle(signup, previousStatus);
      if (reviewResult.ok) return reviewResult;
    }

    const row = signupToRow(signup);
    const mode = options.mode || 'upsert';
    const request = mode === 'update'
      ? supabase.from(SIGNUP_TABLE).update(row).eq('id', signup.id)
      : supabase.from(SIGNUP_TABLE).upsert(row, { onConflict: 'id' });
    const { data, error } = await request.select('*').single();

    if (error) {
      console.warn('Could not save Supabase training sign-up; local fallback remains active.', error);
      return { ok: false, reason: error.message };
    }

    const saved = rowToSignup(data);
    const signups = window.VolunteerDataStore.getTrainingSignups();
    const index = signups.findIndex(item => item.id === saved.id);
    if (index >= 0) signups[index] = saved;
    else signups.push(saved);
    window.VolunteerDataStore.saveTrainingSignups(signups);
    window.dispatchEvent(new CustomEvent('volunteer-training-signups-synced'));
    await notifySavedTrainingSignup(saved, previousStatus);
    return { ok: true, signup: saved };
  }

  function signupByTrainingForCurrentUser(trainingId) {
    const email = window.VolunteerDataStore.currentEmail();
    return window.VolunteerDataStore.getTrainingSignups()
      .find(item => item.email === email && String(item.trainingId) === String(trainingId));
  }

  function signupById(signupId) {
    return window.VolunteerDataStore.getTrainingSignups().find(item => item.id === signupId);
  }

  function persistSignup(signup, options = {}) {
    if (!signup) return Promise.resolve({ ok: false, reason: 'missing_signup' });
    return saveSupabaseTrainingSignup(signup, options).then(result => {
      if (result?.ok) return fetchSupabaseTrainingSignups();
      return result;
    });
  }

  function refreshTrainingViews() {
    if (typeof phaseFourRender === 'function') phaseFourRender();
  }

  function installClickPersistence() {
    if (window.__phaseTenTrainingClickPersistenceInstalled) return;
    window.__phaseTenTrainingClickPersistenceInstalled = true;

    document.addEventListener('click', event => {
      const signupButton = event.target.closest('[data-signup-training]');
      if (signupButton) {
        const trainingId = signupButton.dataset.signupTraining;
        window.setTimeout(() => persistSignup(signupByTrainingForCurrentUser(trainingId), { mode: 'upsert', capacityCreate: true }), 0);
        return;
      }

      const cancelButton = event.target.closest('[data-cancel-training]');
      if (cancelButton) {
        const trainingId = cancelButton.dataset.cancelTraining;
        window.setTimeout(() => persistSignup(signupByTrainingForCurrentUser(trainingId), { mode: 'update' }), 0);
        return;
      }

      const statusButton = event.target.closest('[data-training-status]');
      if (statusButton) {
        const signupId = statusButton.dataset.trainingStatus;
        window.setTimeout(() => persistSignup(signupById(signupId), { mode: 'update', lifecycleReview: true }), 0);
        return;
      }

      const completeButton = event.target.closest('[data-complete-training]');
      if (completeButton) {
        const signupId = completeButton.dataset.completeTraining;
        window.setTimeout(() => persistSignup(signupById(signupId), { mode: 'update', lifecycleReview: true }), 0);
      }
    }, true);
  }

  async function syncAndRender() {
    if (!isReady()) return;
    await applySupabaseTrainingSessions();
    await fetchSupabaseTrainingSignups();
    refreshTrainingViews();
  }

  Object.assign(window.VolunteerDataStore, {
    fetchSupabaseTrainingSessions,
    applySupabaseTrainingSessions,
    syncTrainingSessionsToSupabase,
    fetchSupabaseTrainingSignups,
    saveSupabaseTrainingSignup,
    createSupabaseTrainingSignupWithCapacity,
    reviewSupabaseTrainingSignupLifecycle
  });

  window.addEventListener('volunteer-auth-ready', syncAndRender);
  window.addEventListener('volunteer-auth-changed', syncAndRender);
  window.addEventListener('volunteer-training-signups-synced', refreshTrainingViews);

  document.addEventListener('DOMContentLoaded', () => {
    installClickPersistence();
    window.setTimeout(applySupabaseTrainingSessions, 180);
    window.setTimeout(syncAndRender, 260);
  });
})();
