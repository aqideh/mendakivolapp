(() => {
  if (window.__phaseThirtyEightDrawerReviewActionsInstalled) return;
  window.__phaseThirtyEightDrawerReviewActionsInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function session() { return store()?.getSession?.() || store()?.$?.session?.() || {}; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
  function byId(items, id) { return (items || []).find(item => String(item.id) === String(id)); }
  function now() { return new Date().toISOString(); }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }

  function button(action, label, primary = false) {
    return `<button class="button ${primary ? 'button-primary' : 'dashboard-secondary'}" type="button" data-phase38-review-action="${action}">${label}</button>`;
  }

  function fieldBlock(record) {
    const raw = record?.raw || {};
    const meta = raw.metadata || {};
    const notes = raw.adminNotes || raw.admin_notes || meta.admin_notes || '';
    const claimedHours = raw.claimedHours || raw.claimed_hours || record?.hours || '';
    const verifiedHours = raw.verifiedHours || raw.verified_hours || claimedHours || '';
    const hoursField = record?.__type === 'Attendance claim'
      ? `<label class="phase39-drawer-field">Verified hours<input type="number" min="0" step="0.25" value="${escapeHtml(verifiedHours)}" data-phase39-verified-hours placeholder="${escapeHtml(claimedHours || '0')}"></label>`
      : '';
    return `
      <div class="phase39-drawer-fields">
        ${hoursField}
        <label class="phase39-drawer-field">Admin notes<textarea rows="3" data-phase39-admin-notes placeholder="Optional note for this review">${escapeHtml(notes)}</textarea></label>
        <div class="phase39-action-notice" data-phase39-action-notice hidden></div>
      </div>
    `;
  }

  function renderSignup(record) {
    const current = String(record?.status || '');
    return [
      fieldBlock(record),
      current !== 'confirmed' ? button('signup:confirmed', 'Confirm', true) : '',
      current !== 'waitlisted' ? button('signup:waitlisted', 'Waitlist') : '',
      current !== 'declined' ? button('signup:declined', 'Decline') : '',
      current !== 'pending_review' ? button('signup:pending_review', 'Reset pending') : ''
    ].join('');
  }

  function renderAttendance(record) {
    const current = String(record?.status || '');
    return [
      fieldBlock(record),
      current !== 'verified' ? button('attendance:verified', 'Verify', true) : '',
      current !== 'clarification_requested' ? button('attendance:clarification_requested', 'Request clarification') : '',
      current !== 'rejected' ? button('attendance:rejected', 'Reject') : ''
    ].join('');
  }

  function renderTraining(record) {
    if (record?.__type !== 'Training sign-up') return '<span class="dashboard-muted">Use existing tools to edit training session details.</span>';
    const current = String(record?.status || '');
    return [
      fieldBlock(record),
      current !== 'completed' ? button('training:completed', 'Mark completed', true) : '',
      current !== 'no_show' ? button('training:no_show', 'Mark no-show') : '',
      current !== 'cancelled' ? button('training:cancelled', 'Cancel') : '',
      current !== 'registered' ? button('training:registered', 'Reset registered') : ''
    ].join('');
  }

  function renderReferral(record) {
    const current = String(record?.status || '');
    return [
      fieldBlock(record),
      current !== 'accepted' ? button('referral:accepted', 'Mark accepted', true) : '',
      current !== 'converted' ? button('referral:converted', 'Mark converted', true) : '',
      current !== 'duplicate' ? button('referral:duplicate', 'Mark duplicate') : '',
      current !== 'cancelled' ? button('referral:cancelled', 'Cancel referral') : ''
    ].join('');
  }

  function renderActions(record) {
    if (!isAdmin()) return '<span class="dashboard-muted">Admin access required.</span>';
    if (record?.__type === 'Opportunity sign-up') return renderSignup(record);
    if (record?.__type === 'Attendance claim') return renderAttendance(record);
    if (record?.__type === 'Training sign-up' || record?.__type === 'Training programme/session') return renderTraining(record);
    if (record?.__type === 'Referral') return renderReferral(record);
    if (record?.__type === 'Points ledger entry') return '<span class="dashboard-muted">Points adjustment is policy-gated and remains read-only in this phase.</span>';
    return '<span class="dashboard-muted">No drawer review actions for this record type yet.</span>';
  }

  function drawer() { return document.querySelector('.phase36-drawer'); }
  function notesValue() { return drawer()?.querySelector('[data-phase39-admin-notes]')?.value?.trim() || ''; }
  function verifiedHoursValue(fallback = 0) {
    const value = drawer()?.querySelector('[data-phase39-verified-hours]')?.value;
    if (value === undefined || value === null || value === '') return Number(fallback || 0);
    return Math.max(0, Number(value || 0));
  }

  function showNotice(message, variant = 'success') {
    const node = drawer()?.querySelector('[data-phase39-action-notice]');
    if (node) {
      node.hidden = false;
      node.textContent = message;
      node.dataset.variant = variant;
    }
    if (variant === 'error') window.alert(message);
  }

  async function refresh(message = 'Review action saved.') {
    if (typeof store()?.fetchSupabaseOpportunitySignups === 'function') await store().fetchSupabaseOpportunitySignups();
    if (typeof store()?.fetchSupabaseAttendanceClaims === 'function') await store().fetchSupabaseAttendanceClaims();
    if (typeof store()?.fetchSupabaseTrainingSignups === 'function') await store().fetchSupabaseTrainingSignups();
    if (typeof window.MENDAKIReferrals?.sync === 'function') await window.MENDAKIReferrals.sync();
    if (typeof window.MENDAKIGamification?.sync === 'function') await window.MENDAKIGamification.sync({ award: false });
    if (typeof store()?.fetchNotifications === 'function') await store().fetchNotifications();
    showNotice(message);
    window.setTimeout(() => {
      window.MENDAKIPhase36AdminTables?.closeDrawer?.();
      window.MENDAKIPhase34AdminShell?.mountArea?.();
    }, 450);
  }

  async function updateSignup(record, status) {
    const signup = byId(store()?.getOpportunitySignups?.(), record.__id);
    if (!signup || typeof store()?.reviewSupabaseSignupWithCapacity !== 'function') throw new Error('Sign-up review is unavailable.');
    if (!window.confirm(`Set sign-up status to ${status}?`)) return;
    const next = { ...signup, status, adminNotes: notesValue() || signup.adminNotes || '', reviewedAt: now(), reviewedBy: session().email || 'admin', updatedAt: now() };
    const result = await store().reviewSupabaseSignupWithCapacity(next, signup.status || '');
    if (!result?.ok) throw new Error(result?.reason || 'Sign-up review failed.');
    await refresh(`Sign-up updated to ${status}.`);
  }

  async function updateAttendance(record, status) {
    const claim = byId(store()?.getAttendanceClaims?.(), record.__id);
    if (!claim || typeof store()?.saveSupabaseAttendanceClaim !== 'function') throw new Error('Attendance review is unavailable.');
    if (!window.confirm(`Set attendance status to ${status}?`)) return;
    const fallbackHours = status === 'verified' ? Number(claim.verifiedHours || claim.claimedHours || record.hours || 0) : Number(claim.verifiedHours || 0);
    const verifiedHours = status === 'verified' || status === 'adjusted' ? verifiedHoursValue(fallbackHours) : fallbackHours;
    const next = { ...claim, claimStatus: status, verifiedHours, adminNotes: notesValue() || claim.adminNotes || '', reviewedBy: session().email || 'admin', reviewedAt: now(), updatedAt: now() };
    const result = await store().saveSupabaseAttendanceClaim(next, { mode: 'update', review: true });
    if (!result?.ok && !result?.transactional) throw new Error(result?.reason || 'Attendance review failed.');
    await refresh(`Attendance claim updated to ${status}.`);
  }

  async function updateTraining(record, status) {
    const signup = byId(store()?.getTrainingSignups?.(), record.__id);
    if (!signup || typeof store()?.saveSupabaseTrainingSignup !== 'function') throw new Error('Training review is unavailable.');
    if (!window.confirm(`Set training sign-up status to ${status}?`)) return;
    const next = {
      ...signup,
      status,
      adminNotes: notesValue() || signup.adminNotes || '',
      completedAt: status === 'completed' ? (signup.completedAt || now()) : signup.completedAt || '',
      cancelledAt: status === 'cancelled' ? (signup.cancelledAt || now()) : signup.cancelledAt || '',
      reviewedBy: session().email || 'admin',
      reviewedAt: now(),
      updatedAt: now()
    };
    const result = await store().saveSupabaseTrainingSignup(next, { mode: 'update', lifecycleReview: true, previousStatus: signup.status || '' });
    if (!result?.ok) throw new Error(result?.reason || 'Training review failed.');
    await refresh(`Training sign-up updated to ${status}.`);
  }

  async function updateReferral(record, status) {
    if (!client()) throw new Error('Supabase is not configured.');
    if (!window.confirm(`Set referral status to ${status}?`)) return;
    const { data, error } = await client().rpc('review_app_referral_status', {
      p_referral_id: record.__id,
      p_status: status,
      p_admin_notes: notesValue() || null
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.reason || 'Referral review failed.');
    await refresh(`Referral updated to ${status}.`);
  }

  async function handleAction(action) {
    const record = window.MENDAKIPhase36AdminTables?.currentRecord?.();
    if (!record) throw new Error('No selected row.');
    const [type, status] = String(action || '').split(':');
    if (type === 'signup') return updateSignup(record, status);
    if (type === 'attendance') return updateAttendance(record, status);
    if (type === 'training') return updateTraining(record, status);
    if (type === 'referral') return updateReferral(record, status);
    throw new Error('Unsupported review action.');
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

  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-phase38-review-action]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    busy(target, true);
    try {
      await handleAction(target.dataset.phase38ReviewAction);
    } catch (error) {
      showNotice(error.message || 'Could not complete review action.', 'error');
    } finally {
      busy(target, false);
    }
  }, true);

  window.MENDAKIPhase38DrawerActions = { renderActions, handleAction };
})();
