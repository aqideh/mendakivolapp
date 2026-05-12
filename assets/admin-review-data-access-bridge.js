(() => {
  if (window.__adminReviewDataAccessBridgeInstalled) return;
  window.__adminReviewDataAccessBridgeInstalled = true;

  function dataAccess() { return window.MENDAKIDataAccess; }
  function store() { return window.VolunteerDataStore; }
  function drawer() { return document.querySelector('.phase36-drawer'); }
  function currentRecord() { return window.MENDAKIPhase36AdminTables?.currentRecord?.() || null; }
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
    if (requestedStatus === 'confirmed' && finalStatus === 'waitlisted') {
      return 'The sign-up could not be confirmed because the session is full. It was moved to the waitlist automatically.';
    }
    if (requestedStatus === 'confirmed' && finalStatus === 'declined') {
      return 'The sign-up could not be confirmed because the session is full and waitlist is disabled. It was declined automatically.';
    }
    if (requestedStatus !== finalStatus) {
      return `Requested ${requestedStatus}, but the final status is ${finalStatus}.`;
    }
    return `Sign-up updated to ${finalStatus}.`;
  }

  async function refreshQueues(message) {
    if (typeof dataAccess()?.refreshOpportunitySignups === 'function') await dataAccess().refreshOpportunitySignups({ adminOnly: true });
    else if (typeof store()?.fetchSupabaseOpportunitySignups === 'function') await store().fetchSupabaseOpportunitySignups();

    if (typeof dataAccess()?.refreshAttendanceClaims === 'function') await dataAccess().refreshAttendanceClaims({ adminOnly: true });
    else if (typeof store()?.fetchSupabaseAttendanceClaims === 'function') await store().fetchSupabaseAttendanceClaims();

    if (typeof store()?.fetchNotifications === 'function') await store().fetchNotifications();
    showNotice(message || 'Review action saved.');
    window.setTimeout(() => {
      window.MENDAKIPhase36AdminTables?.closeDrawer?.();
      window.MENDAKIPhase34AdminShell?.mountArea?.();
    }, 900);
  }

  async function reviewSignup(record, status) {
    if (typeof dataAccess()?.reviewOpportunitySignup !== 'function') return false;
    if (!window.confirm(`Set sign-up status to ${status}?`)) return true;
    const result = await dataAccess().reviewOpportunitySignup(record.__id, status, { adminNotes: notesValue() });
    if (!result?.ok) throw new Error(result?.reason || 'Sign-up review failed.');
    await refreshQueues(signupResultMessage(status, result));
    return true;
  }

  async function reviewAttendance(record, status) {
    if (typeof dataAccess()?.reviewAttendanceClaim !== 'function') return false;
    if (!requireClarificationMessage(status)) return true;
    if (!window.confirm(`Set attendance status to ${status}?`)) return true;

    const raw = record.raw || {};
    const fallbackHours = status === 'verified'
      ? Number(raw.verifiedHours || raw.verified_hours || raw.claimedHours || raw.claimed_hours || record.hours || 0)
      : Number(raw.verifiedHours || raw.verified_hours || 0);
    const verifiedHours = status === 'verified' || status === 'adjusted'
      ? verifiedHoursValue(fallbackHours)
      : fallbackHours;

    const result = await dataAccess().reviewAttendanceClaim(record.__id, status, {
      verifiedHours,
      fallbackHours,
      adminNotes: notesValue()
    });
    if (!result?.ok && !result?.transactional) throw new Error(result?.reason || 'Attendance review failed.');
    await refreshQueues(status === 'clarification_requested' ? 'Clarification request sent to volunteer.' : `Attendance claim updated to ${status}.`);
    return true;
  }

  async function handleBridgeAction(action) {
    const record = currentRecord();
    if (!record) throw new Error('No selected row.');
    const [type, status] = String(action || '').split(':');
    if (type === 'signup') return reviewSignup(record, status);
    if (type === 'attendance') return reviewAttendance(record, status);
    return false;
  }

  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-phase38-review-action]');
    if (!target) return;

    const action = target.dataset.phase38ReviewAction || '';
    if (!action.startsWith('signup:') && !action.startsWith('attendance:')) return;

    if (!dataAccess()?.reviewOpportunitySignup && !dataAccess()?.reviewAttendanceClaim) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    busy(target, true);
    try {
      const handled = await handleBridgeAction(action);
      if (!handled) target.click();
    } catch (error) {
      showNotice(error.message || 'Could not complete review action.', 'error');
    } finally {
      busy(target, false);
    }
  }, true);
})();
