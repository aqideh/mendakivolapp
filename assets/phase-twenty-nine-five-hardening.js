(() => {
  if (window.__mendakiDataActionsInstalled) return;
  window.__mendakiDataActionsInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function dataAccess() { return window.MENDAKIDataAccess; }
  function ready() { return Boolean(store().authState.supabase && store().getSession()?.email); }

  function setBusy(button, busy, label = 'Saving...') {
    if (!button) return;
    if (busy) {
      button.dataset.dataActionOriginalText = button.textContent || '';
      button.disabled = true;
      button.textContent = label;
      return;
    }
    button.disabled = false;
    if (button.dataset.dataActionOriginalText) button.textContent = button.dataset.dataActionOriginalText;
    delete button.dataset.dataActionOriginalText;
  }

  function showError(message) {
    if (typeof phaseTwoShowModalNotice === 'function') phaseTwoShowModalNotice(message, 'error');
    else window.alert(message);
  }

  function refreshAll() {
    if (typeof renderOpportunities === 'function') renderOpportunities();
    if (typeof phaseOneRenderDashboard === 'function') phaseOneRenderDashboard();
    if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
    if (typeof phaseThreeRender === 'function') phaseThreeRender();
    if (typeof phaseFourRender === 'function') phaseFourRender();
  }

  async function cancelOpportunity(button) {
    setBusy(button, true, 'Cancelling...');
    const result = await dataAccess().cancelOpportunitySignup(button.dataset.cancelSignup);
    setBusy(button, false);
    if (!result.ok) return showError(result.reason || 'Could not cancel this sign-up.');
    refreshAll();
  }

  async function signupTraining(button) {
    setBusy(button, true, 'Signing up...');
    const result = await dataAccess().createTrainingSignup(button.dataset.signupTraining);
    setBusy(button, false);
    if (!result.ok) {
      if (result.reason === 'Please sign in first.') return phaseOneOpenAuth();
      return showError(result.reason || 'Could not sign up for training.');
    }
    refreshAll();
  }

  async function cancelTraining(button) {
    setBusy(button, true, 'Cancelling...');
    const result = await dataAccess().cancelTrainingSignup(button.dataset.cancelTraining);
    setBusy(button, false);
    if (!result.ok) return showError(result.reason || 'Could not cancel training sign-up.');
    refreshAll();
  }

  async function reviewTraining(button) {
    if (!store().isAdmin()) return;
    const signupId = button.dataset.trainingStatus || button.dataset.completeTraining;
    const status = button.dataset.trainingNextStatus || (button.dataset.completeTraining ? 'completed' : 'registered');
    if (!signupId) return;
    setBusy(button, true, 'Saving...');
    const result = await dataAccess().reviewTrainingSignup(signupId, status, {});
    setBusy(button, false);
    if (!result.ok) return window.alert(`Could not update training status: ${result.reason || 'Unknown error'}`);
    refreshAll();
  }

  async function punchAttendance(button) {
    const signupId = button.dataset.attendancePunch;
    const action = button.dataset.attendanceAction || 'checkin';
    const code = window.prompt(`Enter the 4-digit facilitator code to ${action === 'checkout' ? 'check out' : 'check in'}.`);
    if (code === null) return;
    setBusy(button, true, action === 'checkout' ? 'Checking out...' : 'Checking in...');
    const result = await dataAccess().recordAttendancePunch(signupId, action, code);
    setBusy(button, false);
    if (!result.ok) return window.alert(result.reason || 'Could not save attendance.');
    refreshAll();
  }

  async function reviewAttendance(form, submitter) {
    if (!store().isAdmin()) return;
    const claimId = form.dataset.attendanceReview;
    const claim = store().getAttendanceClaims().find(item => item.id === claimId);
    if (!claim || !claimId) return;
    const formData = new FormData(form);
    const enteredHours = Number(formData.get('verifiedHours') || claim.claimedHours || 0);
    const systemHours = Number(form.querySelector('input[name="verifiedHours"]').dataset.systemHours || claim.claimedHours || 0);
    const status = submitter.value === 'reject' ? 'rejected' : submitter.value === 'clarify' ? 'clarification_requested' : enteredHours !== systemHours ? 'adjusted' : 'verified';
    setBusy(submitter, true, 'Saving...');
    const result = await dataAccess().reviewAttendanceClaim(claimId, status, {
      verifiedHours: enteredHours,
      adminNotes: String(formData.get('adminNotes') || '').trim() || null
    });
    setBusy(submitter, false);
    if (!result.ok) return window.alert(`Could not review attendance: ${result.reason || 'Unknown error'}`);
    refreshAll();
  }

  document.addEventListener('click', event => {
    if (!ready()) return;
    const opportunityCancel = event.target.closest('[data-cancel-signup]');
    const trainingSignup = event.target.closest('[data-signup-training]');
    const trainingCancel = event.target.closest('[data-cancel-training]');
    const trainingReview = event.target.closest('[data-training-status], [data-complete-training]');
    const attendancePunch = event.target.closest('[data-attendance-punch]');
    const target = opportunityCancel || trainingSignup || trainingCancel || trainingReview || attendancePunch;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (opportunityCancel) cancelOpportunity(opportunityCancel);
    else if (trainingSignup) signupTraining(trainingSignup);
    else if (trainingCancel) cancelTraining(trainingCancel);
    else if (trainingReview) reviewTraining(trainingReview);
    else if (attendancePunch) punchAttendance(attendancePunch);
  }, true);

  document.addEventListener('submit', event => {
    if (!ready()) return;
    const form = event.target.closest('[data-attendance-review]');
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    reviewAttendance(form, event.submitter);
  }, true);

  window.MENDAKIDataActions = Object.freeze({ refreshAll });
})();
