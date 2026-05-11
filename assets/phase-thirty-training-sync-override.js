(() => {
  if (window.__phaseThirtyTrainingSyncOverrideInstalled) return;
  window.__phaseThirtyTrainingSyncOverrideInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function session() { return store()?.getSession?.() || null; }

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

  async function fetchSupabaseTrainingSignups() {
    const supabase = client();
    if (!supabase || !session()?.email) return [];
    const { data, error } = await supabase
      .from('app_training_signups')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      console.warn('Could not load Phase 30 training sign-ups; keeping local fallback.', error);
      return store()?.getTrainingSignups?.() || [];
    }
    const signups = Array.isArray(data) ? data.map(rowToSignup) : [];
    store()?.saveTrainingSignups?.(signups);
    window.dispatchEvent(new CustomEvent('volunteer-training-signups-synced'));
    return signups;
  }

  function install() {
    if (!store()) return;
    store().fetchSupabaseTrainingSignups = fetchSupabaseTrainingSignups;
    store().refreshPhaseThirtyTrainingSignups = fetchSupabaseTrainingSignups;
  }

  document.addEventListener('DOMContentLoaded', () => window.setTimeout(install, 0));
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', install);
})();
