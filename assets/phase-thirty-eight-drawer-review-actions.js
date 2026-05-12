(() => {
  if (window.__phaseThirtyEightDrawerReviewActionsInstalled) return;
  window.__phaseThirtyEightDrawerReviewActionsInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function dataAccess() { return window.MENDAKIDataAccess; }
  function client() { return store()?.authState?.supabase || null; }
  function isAdmin() { return Boolean(store()?.isAdmin?.()); }
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
    const clarificationResponse = raw.clarificationResponse || raw.clarification_response || '';
    const hoursField = record?.__type === 'Attendance claim'
      ? `<label class="phase39-drawer-field">Verified hours<input type="number" min="0" step="0.25" value="${escapeHtml(verifiedHours)}" data-phase39-verified-hours placeholder="${escapeHtml(claimedHours || '0')}"></label>`
      : '';
    const responseBlock = record?.__type === 'Attendance claim' && clarificationResponse
      ? `<div class="phase39-response-note"><strong>Volunteer clarification</strong><p>${escapeHtml(clarificationResponse)}</p></div>`
      : '';
    return `
      <div class="phase39-drawer-fields">
        ${hoursField}
        ${responseBlock}
        <label class="phase39-drawer-field">Message to volunteer<textarea rows="3" data-phase39-admin-notes placeholder="Required when requesting clarification. Add what you need the volunteer to clarify.">${escapeHtml(notes)}</textarea></label>
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
    if (record?.__type !== 'Training sign-up') return '<span class="dashboard-muted">Use training session tools to edit programme/session details.</span>';
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
    return '<span class="dashboard-muted">No review actions for this record type.</span>';
  }

  function drawer() { return document.querySelector('.phase36-drawer'); }
  function notesField() { return drawer()?.querySelector('[data-phase39-admin-notes]') || null; }
  function notesValue() { return notesField()?.value?.trim() || ''; }
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

  function requireClarificationMessage(status) {
    if (status !== 'clarification_requested') return true;
    const field = notesField();
    if (notesValue()) return true;
    showNotice('Please enter a message explaining what the volunteer should clarify.', 'error');
    if (field) {
      field.focus();
      field.setAttribute('aria-invalid', 'true');
    }
    return false;
  }

  function signupResultMessage(requestedStatus, result) {
    const finalStatus = result?.signup?.status || requestedStatus;
    if (requestedStatus === 'confirmed' && finalStatus === 'waitlisted') return 'The sign-up could not be confirmed because the session is full. It was moved to the waitlist automatically.';
    if (requestedStatus === 'confirmed' && finalStatus === 'declined') return 'The sign-up could not be confirmed because the session is full and waitlist is disabled. It was declined automatically.';
    if (requestedStatus !== finalStatus) return `Requested ${requestedStatus}, but the final status is ${finalStatus}.`;
    return `Sign-up updated to ${finalStatus}.`;
  }

  async function refreshAfterReview(message = 'Review action saved.') {
    showNotice(message);
    window.setTimeout(() => {
      window.MENDAKIPhase36AdminTables?.closeDrawer?.();
      window.MENDAKIPhase34AdminShell?.mountArea?.();
    }, 700);
  }

  async function updateSignup(record, status) {
    if (!window.confirm(`Set sign-up status to ${status}?`)) return;
    const result = await dataAccess().reviewOpportunitySignup(record.__id, status, { adminNotes: notesValue() });
    if (!result?.ok) throw new Error(result?.reason || 'Sign-up review failed.');
    await refreshAfterReview(signupResultMessage(status, result));
  }

  async function updateAttendance(record, status) {
    if (!requireClarificationMessage(status)) return;
    if (!window.confirm(`Set attendance status to ${status}?`)) return;
    const raw = record.raw || {};
    const fallbackHours = status === 'verified' || status === 'adjusted'
      ? Number(raw.verifiedHours || raw.verified_hours || raw.claimedHours || raw.claimed_hours || record.hours || 0)
      : 0;
    const result = await dataAccess().reviewAttendanceClaim(record.__id, status, {
      verifiedHours: status === 'verified' || status === 'adjusted' ? verifiedHoursValue(fallbackHours) : 0,
      adminNotes: notesValue()
    });
    if (!result?.ok) throw new Error(result?.reason || 'Attendance review failed.');
    await refreshAfterReview(status === 'clarification_requested' ? 'Clarification request sent to volunteer.' : `Attendance claim updated to ${status}.`);
  }

  async function updateTraining(record, status) {
    if (!window.confirm(`Set training sign-up status to ${status}?`)) return;
    const result = await dataAccess().reviewTrainingSignup(record.__id, status, { adminNotes: notesValue() });
    if (!result?.ok) throw new Error(result?.reason || 'Training review failed.');
    await refreshAfterReview(`Training sign-up updated to ${result.signup?.status || status}.`);
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
    if (typeof window.MENDAKIReferrals?.sync === 'function') await window.MENDAKIReferrals.sync();
    if (typeof store()?.fetchNotifications === 'function') await store().fetchNotifications();
    await refreshAfterReview(`Referral updated to ${status}.`);
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
