(() => {
  if (window.__trainingLifecycleBridgeInstalled) return;
  window.__trainingLifecycleBridgeInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function drawer() { return document.querySelector('.phase36-drawer'); }
  function currentRecord() { return window.MENDAKIPhase36AdminTables?.currentRecord?.() || null; }
  function notesValue() { return drawer()?.querySelector('[data-phase39-admin-notes]')?.value?.trim() || ''; }
  function byId(items, id) { return (items || []).find(item => String(item.id) === String(id)); }

  function showNotice(message, variant = 'success') {
    const node = drawer()?.querySelector('[data-phase39-action-notice]');
    if (node) {
      node.hidden = false;
      node.textContent = message;
      node.dataset.variant = variant;
    }
    if (variant === 'error') window.alert(message);
  }

  function busy(button, on) {
    if (!button) return;
    if (on) {
      button.dataset.originalText = button.textContent || '';
      button.disabled = true;
      button.textContent = 'Saving...';
    } else {
      button.disabled = false;
      if (button.dataset.originalText) button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }

  function trainingSignupFromRow(row, fallback = {}) {
    if (!row) return null;
    return {
      id: row.id,
      trainingId: String(row.training_id || fallback.trainingId || ''),
      trainingSessionId: row.training_session_id || fallback.trainingSessionId || '',
      appUserId: row.volunteer_user_id || fallback.appUserId || '',
      email: row.email || fallback.email || '',
      volunteerName: row.volunteer_name || fallback.volunteerName || 'Volunteer',
      title: row.title || fallback.title || '',
      date: row.session_date || fallback.date || '',
      time: row.time || fallback.time || '',
      location: row.location || fallback.location || '',
      trainer: row.trainer || fallback.trainer || '',
      status: row.status || fallback.status || 'registered',
      signedUpAt: row.signed_up_at || fallback.signedUpAt || '',
      completedAt: row.completed_at || fallback.completedAt || '',
      cancelledAt: row.cancelled_at || fallback.cancelledAt || '',
      reviewedBy: row.reviewed_by_email || fallback.reviewedBy || '',
      reviewedAt: row.reviewed_at || fallback.reviewedAt || '',
      adminNotes: row.admin_notes || fallback.adminNotes || '',
      createdAt: row.created_at || fallback.createdAt || '',
      updatedAt: row.updated_at || fallback.updatedAt || ''
    };
  }

  function upsertLocal(signup) {
    if (!signup?.id) return;
    const next = (store()?.getTrainingSignups?.() || []).slice();
    const index = next.findIndex(item => String(item.id) === String(signup.id));
    if (index >= 0) next[index] = signup;
    else next.unshift(signup);
    store()?.saveTrainingSignups?.(next);
    window.dispatchEvent(new CustomEvent('volunteer-training-signups-synced'));
  }

  async function refreshTraining() {
    if (typeof store()?.fetchSupabaseTrainingSignups === 'function') await store().fetchSupabaseTrainingSignups();
    if (typeof store()?.fetchNotifications === 'function') await store().fetchNotifications();
    window.MENDAKIPhase34AdminShell?.mountArea?.();
  }

  async function reviewTraining(record, status) {
    const supabase = client();
    if (!supabase) return false;
    const signup = byId(store()?.getTrainingSignups?.(), record.__id);
    if (!signup) throw new Error('Training sign-up not found.');
    if (!window.confirm(`Set training sign-up status to ${status}?`)) return true;

    const { data, error } = await supabase.rpc('review_training_signup_lifecycle', {
      p_signup_id: signup.id,
      p_status: status,
      p_admin_notes: notesValue() || signup.adminNotes || null
    });
    if (error) throw error;

    const saved = trainingSignupFromRow(data, signup);
    if (saved) upsertLocal(saved);
    if (saved?.status === 'completed' && typeof store()?.notifyTrainingCompletion === 'function') {
      await store().notifyTrainingCompletion(saved).catch(error => console.warn('Could not create training completion notification.', error));
    }
    await refreshTraining();
    showNotice(`Training sign-up updated to ${saved?.status || status}.`);
    window.setTimeout(() => {
      window.MENDAKIPhase36AdminTables?.closeDrawer?.();
      window.MENDAKIPhase34AdminShell?.mountArea?.();
    }, 600);
    return true;
  }

  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-phase38-review-action]');
    if (!target) return;
    const action = target.dataset.phase38ReviewAction || '';
    if (!action.startsWith('training:')) return;
    const record = currentRecord();
    if (!record || record.__type !== 'Training sign-up') return;

    event.preventDefault();
    event.stopImmediatePropagation();
    busy(target, true);
    try {
      const [, status] = action.split(':');
      const handled = await reviewTraining(record, status);
      if (!handled) target.click();
    } catch (error) {
      showNotice(error.message || 'Could not update training sign-up.', 'error');
    } finally {
      busy(target, false);
    }
  }, true);
})();
