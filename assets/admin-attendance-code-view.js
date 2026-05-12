(() => {
  let attendanceCodes = {};
  let fetchInProgress = false;

  function store() { return window.VolunteerDataStore; }
  function isAdmin() { return store().isAdmin(); }
  function escapeHtml(value) { return store().utils.escapeHtml(value); }

  async function refreshAttendanceCodes() {
    if (!isAdmin()) return;
    if (fetchInProgress) return;
    fetchInProgress = true;
    try {
      attendanceCodes = await store().fetchAttendanceCodes();
      applyAttendanceCodesToAdminUi();
    } finally {
      fetchInProgress = false;
    }
  }

  function opportunityIdFromForm(form) {
    return String(form.querySelector('[name="id"]').value || '').trim();
  }

  function prefillOpportunityForm() {
    const form = document.querySelector('[data-content-form="opportunity"]');
    if (!form) return;
    const opportunityId = opportunityIdFromForm(form);
    if (!opportunityId) return;
    const codeRecord = attendanceCodes[opportunityId];
    const input = form.querySelector('[name="facilitatorCode"]');
    if (!input || !codeRecord?.code) return;
    if (!input.value) input.value = codeRecord.code;

    let note = form.querySelector('[data-current-facilitator-code]');
    if (!note) {
      note = document.createElement('p');
      note.className = 'dashboard-muted';
      note.dataset.currentFacilitatorCode = 'true';
      input.closest('label').after(note);
    }
    note.textContent = `Current saved facilitator code: ${codeRecord.code}`;
  }

  function annotateOpportunityList() {
    document.querySelectorAll('[data-content-edit-id]').forEach(button => {
      const opportunityId = button.dataset.contentEditId;
      const item = button.closest('.admin-content-item');
      if (!item || !opportunityId) return;
      const codeRecord = attendanceCodes[opportunityId];
      let note = item.querySelector('[data-facilitator-code-note]');
      if (!note) {
        note = document.createElement('span');
        note.dataset.facilitatorCodeNote = 'true';
        item.querySelector('span span').after(note);
      }
      note.innerHTML = codeRecord?.code
        ? `Facilitator code: <strong>${escapeHtml(codeRecord.code)}</strong>`
        : 'Facilitator code: not set';
    });
  }

  function applyAttendanceCodesToAdminUi() {
    if (!isAdmin()) return;
    annotateOpportunityList();
    prefillOpportunityForm();
  }

  function scheduleApply() {
    window.setTimeout(applyAttendanceCodesToAdminUi, 60);
    window.setTimeout(applyAttendanceCodesToAdminUi, 240);
  }

  function bindUiObserver() {
    if (window.__adminAttendanceCodeViewBound) return;
    window.__adminAttendanceCodeViewBound = true;
    document.addEventListener('click', event => {
      if (
        event.target.closest('[data-content-type="opportunity"]') ||
        event.target.closest('[data-content-mode="edit"]') ||
        event.target.closest('[data-content-edit-id]') ||
        event.target.closest('[data-content-back]')
      ) {
        refreshAttendanceCodes().then(scheduleApply);
      }
    }, true);
    document.addEventListener('submit', event => {
      if (event.target.closest('[data-content-form="opportunity"]')) {
        window.setTimeout(() => refreshAttendanceCodes().then(scheduleApply), 900);
      }
    }, true);
    window.addEventListener('volunteer-opportunities-synced', () => refreshAttendanceCodes().then(scheduleApply));
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindUiObserver();
    window.setTimeout(refreshAttendanceCodes, 700);
  });
  window.addEventListener('volunteer-auth-ready', refreshAttendanceCodes);
  window.addEventListener('volunteer-auth-changed', refreshAttendanceCodes);
})();
