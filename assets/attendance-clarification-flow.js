(() => {
  if (window.__attendanceClarificationFlowInstalled) return;
  window.__attendanceClarificationFlowInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function escapeHtml(value) { return store()?.utils?.escapeHtml?.(value) || String(value ?? ''); }
  function currentEmail() { return store()?.currentEmail?.() || store()?.getSession?.()?.email || ''; }
  function claims() { return store()?.getAttendanceClaims?.() || []; }
  function saveClaims(nextClaims) { return store()?.saveAttendanceClaims?.(nextClaims); }

  function formatTimestamp(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  function installStyles() {
    if (document.querySelector('[data-attendance-clarification-style]')) return;
    const style = document.createElement('style');
    style.dataset.attendanceClarificationStyle = 'true';
    style.textContent = `
      .attendance-clarification-card {
        background: rgba(190, 128, 34, 0.08);
        border: 1px solid rgba(190, 128, 34, 0.22);
        border-radius: 1rem;
        display: grid;
        gap: 0.7rem;
        grid-column: 1 / -1;
        margin-top: 0.85rem;
        padding: 0.9rem;
        width: 100%;
      }
      .attendance-clarification-card strong { display: block; }
      .attendance-clarification-card p { margin: 0.15rem 0 0; }
      .attendance-clarification-form { display: grid; gap: 0.65rem; }
      .attendance-clarification-form label {
        display: grid;
        gap: 0.3rem;
        font-weight: 800;
      }
      .attendance-clarification-form textarea {
        border: 1px solid rgba(55, 58, 54, 0.18);
        border-radius: 0.8rem;
        font: inherit;
        min-height: 5.5rem;
        padding: 0.7rem 0.8rem;
        resize: vertical;
        width: 100%;
      }
      .attendance-clarification-response {
        background: #fff;
        border-radius: 0.8rem;
        padding: 0.7rem 0.8rem;
      }
    `;
    document.head.append(style);
  }

  function clarificationCard(claim) {
    if (!claim || claim.claimStatus !== 'clarification_requested') return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'attendance-clarification-card';
    const response = String(claim.clarificationResponse || '').trim();
    const respondedAt = formatTimestamp(claim.clarificationRespondedAt);
    wrapper.innerHTML = `
      <div>
        <strong>Clarification requested</strong>
        <p class="dashboard-muted">${escapeHtml(claim.adminNotes || 'Please provide more details for this attendance record.')}</p>
      </div>
      ${response ? `
        <div class="attendance-clarification-response">
          <strong>Your response</strong>
          <p>${escapeHtml(response)}</p>
          ${respondedAt ? `<p class="dashboard-muted">Submitted ${escapeHtml(respondedAt)}</p>` : ''}
        </div>
      ` : `
        <form class="attendance-clarification-form" data-attendance-clarification-response="${escapeHtml(claim.id)}">
          <label>Your clarification
            <textarea name="clarificationResponse" required placeholder="Explain what happened or add any missing details for admin review."></textarea>
          </label>
          <button class="button button-primary" type="submit">Send clarification</button>
        </form>
      `}
    `;
    return wrapper;
  }

  function installVolunteerRowWrapper() {
    if (typeof window.phaseThreeVolunteerRow !== 'function') return false;
    if (window.phaseThreeVolunteerRow.__attendanceClarificationWrapped) return true;
    const original = window.phaseThreeVolunteerRow;
    const wrapped = function attendanceClarificationVolunteerRow(signup) {
      const row = original(signup);
      const claim = claims().find(item => item.signupId === signup.id);
      const card = clarificationCard(claim);
      if (card) row.append(card);
      return row;
    };
    wrapped.__attendanceClarificationWrapped = true;
    window.phaseThreeVolunteerRow = wrapped;
    return true;
  }

  async function submitClarification(form) {
    const claimId = form.dataset.attendanceClarificationResponse;
    const textarea = form.querySelector('textarea[name="clarificationResponse"]');
    const response = String(textarea?.value || '').trim();
    if (!response) {
      textarea?.focus();
      window.alert('Please enter your clarification before submitting.');
      return;
    }

    const allClaims = claims();
    const index = allClaims.findIndex(item => String(item.id) === String(claimId));
    if (index < 0) return window.alert('Could not find this attendance record. Please refresh and try again.');

    const claim = allClaims[index];
    if (claim.email !== currentEmail()) return window.alert('You can only respond to your own attendance clarification requests.');

    const now = new Date().toISOString();
    const next = {
      ...claim,
      claimStatus: 'submitted',
      clarificationResponse: response,
      clarificationRespondedAt: now,
      updatedAt: now
    };
    allClaims[index] = next;
    saveClaims(allClaims);

    const button = form.querySelector('button[type="submit"]');
    const originalText = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending...';
    }

    try {
      if (typeof store()?.saveSupabaseAttendanceClaim === 'function') {
        const result = await store().saveSupabaseAttendanceClaim(next, { mode: 'update', clarificationResponse: true });
        if (!result?.ok) throw new Error(result?.reason || 'Could not save clarification.');
      }
      if (typeof store()?.fetchSupabaseAttendanceClaims === 'function') await store().fetchSupabaseAttendanceClaims();
      if (typeof window.phaseThreeRender === 'function') window.phaseThreeRender();
      window.alert('Your clarification was sent for admin review.');
    } catch (error) {
      allClaims[index] = claim;
      saveClaims(allClaims);
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
      window.alert(error.message || 'Could not send clarification. Please try again.');
    }
  }

  function installNotificationOverride() {
    if (!store()?.createNotification || store().notifyAttendanceReview?.__clarificationMessageEnhanced) return false;
    const enhanced = async function notifyAttendanceReview(claim) {
      const clarificationMessage = String(claim?.adminNotes || '').trim();
      const labels = {
        verified: ['Attendance verified', `Your attendance for ${claim?.title || 'your opportunity'} has been verified.`],
        adjusted: ['Attendance adjusted', `Your attendance hours for ${claim?.title || 'your opportunity'} have been adjusted and verified.`],
        clarification_requested: [
          'Attendance clarification needed',
          clarificationMessage
            ? `Admin requested clarification for ${claim?.title || 'your opportunity'}: ${clarificationMessage}`
            : `Admin requested clarification for your attendance record: ${claim?.title || 'your opportunity'}.`
        ],
        rejected: ['Attendance rejected', `Your attendance record for ${claim?.title || 'your opportunity'} was rejected.`]
      };
      const copy = labels[claim?.claimStatus];
      if (!copy || !claim?.email || !claim?.id) return { ok: false, skipped: true };
      return store().createNotification({
        recipientEmail: claim.email,
        recipientRole: 'volunteer',
        title: copy[0],
        message: copy[1],
        type: `attendance_${claim.claimStatus}`,
        relatedTable: 'app_attendance_claims',
        relatedId: claim.id,
        groupKey: `attendance:${claim.id}:${claim.claimStatus}:${claim.reviewedAt || claim.updatedAt || ''}`,
        metadata: { adminNotes: clarificationMessage }
      }, { dedupe: false });
    };
    enhanced.__clarificationMessageEnhanced = true;
    store().notifyAttendanceReview = enhanced;
    return true;
  }

  function install() {
    installStyles();
    installVolunteerRowWrapper();
    installNotificationOverride();
  }

  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-attendance-clarification-response]');
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitClarification(form);
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    install();
    window.setTimeout(install, 500);
    window.setTimeout(() => {
      install();
      if (typeof window.phaseThreeRender === 'function') window.phaseThreeRender();
    }, 1200);
  });
  window.addEventListener('volunteer-auth-ready', install);
  window.addEventListener('volunteer-auth-changed', install);
  window.addEventListener('volunteer-attendance-synced', install);
})();
