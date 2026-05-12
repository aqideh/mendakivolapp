(() => {
  if (window.__mendakiAdminReviewActionsInstalled) return;
  window.__mendakiAdminReviewActionsInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function dataAccess() { return window.MENDAKIDataAccess; }
  function adminTables() { return window.MENDAKIAdminTables; }
  function adminWorkspace() { return window.MENDAKIAdminWorkspace; }
  function client() { return store().authState.supabase; }
  function isAdmin() { return store().isAdmin(); }
  function escapeHtml(value) { return store().utils.escapeHtml(value); }

  function button(action, label, primary = false) {
    return `<button class="button ${primary ? 'button-primary' : 'dashboard-secondary'}" type="button" data-admin-review-action="${action}">${escapeHtml(label)}</button>`;
  }

  function fieldBlock(record) {
    const raw = record.raw || {};
    const meta = raw.metadata || {};
    const notes = raw.adminNotes || raw.admin_notes || meta.admin_notes || '';
    const claimedHours = raw.claimedHours || raw.claimed_hours || record.hours || '';
    const verifiedHours = raw.verifiedHours || raw.verified_hours || claimedHours || '';
    const clarificationResponse = raw.clarificationResponse || raw.clarification_response || '';
    const hoursField = record.__type === 'Attendance claim'
      ? `<label class="phase39-drawer-field">Verified hours<input type="number" min="0" step="0.25" value="${escapeHtml(verifiedHours)}" data-admin-review-verified-hours placeholder="${escapeHtml(claimedHours || '0')}"></label>`
      : '';
    const responseBlock = record.__type === 'Attendance claim' && clarificationResponse
      ? `<div class="phase39-response-note"><strong>Volunteer clarification</strong><p>${escapeHtml(clarificationResponse)}</p></div>`
      : '';
    return `<div class="phase39-drawer-fields">${hoursField}${responseBlock}<label class="phase39-drawer-field">Message to volunteer<textarea rows="3" data-admin-review-notes placeholder="Required when requesting clarification. Add what you need the volunteer to clarify.">${escapeHtml(notes)}</textarea></label><div class="phase39-action-notice" data-admin-review-notice hidden></div></div>`;
  }

  function renderSignup(record) {
    const current = String(record.status || '');
    return [fieldBlock(record), current !== 'confirmed' ? button('signup:confirmed', 'Confirm', true) : '', current !== 'waitlisted' ? button('signup:waitlisted', 'Waitlist') : '', current !== 'declined' ? button('signup:declined', 'Decline') : '', current !== 'pending_review' ? button('signup:pending_review', 'Reset pending') : ''].join('');
  }

  function renderAttendance(record) {
    const current = String(record.status || '');
    return [fieldBlock(record), current !== 'verified' ? button('attendance:verified', 'Verify', true) : '', current !== 'clarification_requested' ? button('attendance:clarification_requested', 'Request clarification') : '', current !== 'rejected' ? button('attendance:rejected', 'Reject') : ''].join('');
  }

  function renderTraining(record) {
    if (record.__type !== 'Training sign-up') return '<span class="dashboard-muted">Use training session tools to edit programme/session details.</span>';
    const current = String(record.status || '');
    return [fieldBlock(record), current !== 'completed' ? button('training:completed', 'Mark completed', true) : '', current !== 'no_show' ? button('training:no_show', 'Mark no-show') : '', current !== 'cancelled' ? button('training:cancelled', 'Cancel') : '', current !== 'registered' ? button('training:registered', 'Reset registered') : ''].join('');
  }

  function renderReferral(record) {
    const current = String(record.status || '');
    return [fieldBlock(record), current !== 'accepted' ? button('referral:accepted', 'Mark accepted', true) : '', current !== 'converted' ? button('referral:converted', 'Mark converted', true) : '', current !== 'duplicate' ? button('referral:duplicate', 'Mark duplicate') : '', current !== 'cancelled' ? button('referral:cancelled', 'Cancel referral') : ''].join('');
  }

  function renderActions(record) {
    if (!isAdmin()) return '<span class="dashboard-muted">Admin access required.</span>';
    if (record.__type === 'Opportunity sign-up') return renderSignup(record);
    if (record.__type === 'Attendance claim') return renderAttendance(record);
    if (record.__type === 'Training sign-up' || record.__type === 'Training programme/session') return renderTraining(record);
    if (record.__type === 'Referral') return renderReferral(record);
    if (record.__type === 'Points ledger entry') return '<span class="dashboard-muted">Points adjustment is policy-gated and remains read-only in this phase.</span>';
    return '<span class="dashboard-muted">No review actions for this record type.</span>';
  }

  function drawer() { return document.querySelector('.phase36-drawer'); }
  function notesField() { return drawer().querySelector('[data-admin-review-notes]'); }
  function notesValue() { return notesField().value.trim(); }
  function verifiedHoursValue(fallback = 0) {
    const value = drawer().querySelector('[data-admin-review-verified-hours]')?.value;
    if (value === undefined || value === null || value === '') return Number(fallback || 0);
    return Math.max(0, Number(value || 0));
  }

  function showNotice(message, variant = 'success') {
    const node = drawer().querySelector('[data-admin-review-notice]');
    node.hidden = false;
    node.textContent = message;
    node.dataset.variant = variant;
    if (variant === 'error') window.alert(message);
  }

  function requireClarificationMessage(status) {
    if (status !== 'clarification_requested') return true;
    const field = notesField();
    if (notesValue()) return true;
    showNotice('Please enter a message explaining what the volunteer should clarify.', 'error');
    field.focus();
    field.setAttribute('aria-invalid', 'true');
    return false;
  }

  function signupResultMessage(requestedStatus, result) {
    const finalStatus = result.signup?.status || requestedStatus;
    if (requestedStatus === 'confirmed' && finalStatus === 'waitlisted') return 'The sign-up could not be confirmed because the session is full. It was moved to the waitlist automatically.';
    if (requestedStatus === 'confirmed' && finalStatus === 'declined') return 'The sign-up could not be confirmed because the session is full and waitlist is disabled. It was declined automatically.';
    if (requestedStatus !== finalStatus) return `Requested ${requestedStatus}, but the final status is ${finalStatus}.`;
    return `Sign-up updated to ${finalStatus}.`;
  }

  async function refreshAfterReview(message = 'Review action saved.') {
    showNotice(message);
    window.setTimeout(() => {
      adminTables().closeDrawer();
      adminWorkspace().mountArea();
    }, 700);
  }

  async function updateSignup(record, status) {
    if (!window.confirm(`Set sign-up status to ${status}?`)) return;
    const result = await dataAccess().reviewOpportunitySignup(record.__id, status, { adminNotes: notesValue() });
    if (!result.ok) throw new Error(result.reason || 'Sign-up review failed.');
    await refreshAfterReview(signupResultMessage(status, result));
  }

  async function updateAttendance(record, status) {
    if (!requireClarificationMessage(status)) return;
    if (!window.confirm(`Set attendance status to ${status}?`)) return;
    const raw = record.raw || {};
    const hoursRequired = status === 'verified' || status === 'adjusted';
    const baseHours = Number(raw.verifiedHours || raw.verified_hours || raw.claimedHours || raw.claimed_hours || record.hours || 0);
    const result = await dataAccess().reviewAttendanceClaim(record.__id, status, {
      verifiedHours: hoursRequired ? verifiedHoursValue(baseHours) : 0,
      adminNotes: notesValue()
    });
    if (!result.ok) throw new Error(result.reason || 'Attendance review failed.');
    await refreshAfterReview(status === 'clarification_requested' ? 'Clarification request sent to volunteer.' : `Attendance claim updated to ${status}.`);
  }

  async function updateTraining(record, status) {
    if (!window.confirm(`Set training sign-up status to ${status}?`)) return;
    const result = await dataAccess().reviewTrainingSignup(record.__id, status, { adminNotes: notesValue() });
    if (!result.ok) throw new Error(result.reason || 'Training review failed.');
    await refreshAfterReview(`Training sign-up updated to ${result.signup?.status || status}.`);
  }

  async function updateReferral(record, status) {
    if (!window.confirm(`Set referral status to ${status}?`)) return;
    const { data, error } = await client().rpc('review_app_referral_status', {
      p_referral_id: record.__id,
      p_status: status,
      p_admin_notes: notesValue() || null
    });
    if (error) throw error;
    if (!data.ok) throw new Error(data.reason || 'Referral review failed.');
    await window.MENDAKIReferrals.sync();
    await store().fetchNotifications();
    await refreshAfterReview(`Referral updated to ${status}.`);
  }

  async function handleAction(action) {
    const record = adminTables().currentRecord();
    if (!record) throw new Error('No selected row.');
    const [type, status] = String(action || '').split(':');
    if (type === 'signup') return updateSignup(record, status);
    if (type === 'attendance') return updateAttendance(record, status);
    if (type === 'training') return updateTraining(record, status);
    if (type === 'referral') return updateReferral(record, status);
    throw new Error('Unsupported review action.');
  }

  function busy(button, on) {
    if (on) {
      button.dataset.originalText = button.textContent || '';
      button.disabled = true;
      button.textContent = 'Saving...';
      return;
    }
    button.disabled = false;
    if (button.dataset.originalText) button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }

  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-admin-review-action]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    busy(target, true);
    try {
      await handleAction(target.dataset.adminReviewAction);
    } catch (error) {
      showNotice(error.message || 'Could not complete review action.', 'error');
    } finally {
      busy(target, false);
    }
  }, true);

  window.MENDAKIAdminReviewActions = Object.freeze({ renderActions, handleAction });
})();
