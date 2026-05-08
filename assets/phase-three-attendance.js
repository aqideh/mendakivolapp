const PHASE_THREE_ATTENDANCE_KEY = VolunteerDataStore.keys.attendanceClaims;
const PHASE_THREE_CODE_PATTERN = /^\d{4}$/;

function phaseThreeReadJson(key) {
  return VolunteerDataStore.readJson(key, null);
}

function phaseThreeWriteJson(key, value) {
  return VolunteerDataStore.writeJson(key, value);
}

function phaseThreeClaims() {
  return VolunteerDataStore.getAttendanceClaims();
}

function phaseThreeWriteClaims(claims) {
  return VolunteerDataStore.saveAttendanceClaims(claims);
}

function phaseThreeProfile() {
  return VolunteerDataStore.getProfile() || {};
}

function phaseThreeSession() {
  return VolunteerDataStore.normaliseSessionRole() || {};
}

function phaseThreeSignups() {
  return VolunteerDataStore.getOpportunitySignups();
}

function phaseThreeWriteSignups(signups) {
  return VolunteerDataStore.saveOpportunitySignups(signups);
}

function phaseThreeEmail() {
  return VolunteerDataStore.currentEmail();
}

function phaseThreeIsSignedIn() {
  return VolunteerDataStore.isSignedIn();
}

function phaseThreeIsAdmin() {
  return VolunteerDataStore.isAdmin();
}

function phaseThreeClaimForSignup(signupId) {
  return phaseThreeClaims().find(claim => claim.signupId === signupId);
}

function phaseThreeClaimStatusLabel(status) {
  const labels = {
    pending_submission: 'Not checked in',
    checked_in: 'Checked in',
    submitted: 'Checked out',
    clarification_requested: 'Clarification requested',
    verified: 'Verified',
    adjusted: 'Adjusted',
    rejected: 'Rejected',
    no_show: 'No-show'
  };
  return labels[status] || status || 'Not checked in';
}

function phaseThreeStatusClass(status) {
  if (status === 'verified' || status === 'adjusted') return 'badge-open';
  if (status === 'rejected' || status === 'no_show') return 'badge-ad-hoc';
  if (status === 'submitted') return 'badge-programme';
  if (status === 'checked_in') return 'badge-long-term';
  return 'badge-volunteer';
}

function phaseThreeEscape(value) {
  return String(value || '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function phaseThreeFormatTimestamp(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function phaseThreeHoursBetween(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  return Math.round(((end - start) / 36e5) * 100) / 100;
}

function phaseThreeNormaliseHours(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return String(number);
}

function phaseThreePersistCompletedSignup(signup) {
  if (!signup) return;
  const refresh = () => {
    if (typeof phaseOneRenderDashboard === 'function') phaseOneRenderDashboard();
    if (typeof phaseThreeRender === 'function') phaseThreeRender();
    window.dispatchEvent(new CustomEvent('volunteer-signups-synced'));
  };

  if (typeof window.phaseTwoPersistSignupChange === 'function') {
    window.phaseTwoPersistSignupChange(signup, { mode: 'update' }).then(refresh).catch(error => {
      console.warn('Could not persist completed sign-up after attendance verification.', error);
      refresh();
    });
    return;
  }

  if (typeof VolunteerDataStore.saveSupabaseOpportunitySignup === 'function') {
    VolunteerDataStore.saveSupabaseOpportunitySignup(signup, { mode: 'update' }).then(() => {
      if (typeof VolunteerDataStore.fetchSupabaseOpportunitySignups === 'function') {
        return VolunteerDataStore.fetchSupabaseOpportunitySignups();
      }
      return null;
    }).then(refresh).catch(error => {
      console.warn('Could not persist completed sign-up after attendance verification.', error);
      refresh();
    });
    return;
  }

  refresh();
}

function phaseThreeEnsureDashboardSections() {
  const layout = document.querySelector('.dashboard-layout');
  if (!layout || document.querySelector('[data-attendance-card]')) return;

  const volunteerCard = document.createElement('section');
  volunteerCard.className = 'dashboard-card attendance-card';
  volunteerCard.dataset.attendanceCard = 'volunteer';
  volunteerCard.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Attendance check-in</h2>
        <p class="dashboard-muted">Tap Check in when you arrive and Check out when you leave. Enter the 4-digit code given by the facilitator each time.</p>
      </div>
    </div>
    <div class="attendance-list" data-attendance-list></div>
  `;

  const adminCard = document.createElement('section');
  adminCard.className = 'dashboard-card attendance-card admin-attendance-card';
  adminCard.dataset.attendanceCard = 'admin';
  adminCard.hidden = true;
  adminCard.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Admin attendance verification</h2>
        <p class="dashboard-muted">Review check-in/check-out records and validate final volunteering hours.</p>
      </div>
    </div>
    <div class="attendance-list" data-admin-attendance-list></div>
  `;

  layout.append(volunteerCard, adminCard);
}

function phaseThreeRender() {
  phaseThreeEnsureDashboardSections();
  phaseThreeRenderVolunteerAttendance();
  phaseThreeRenderAdminQueue();
  phaseThreeUpdateStats();
}

function phaseThreeRenderVolunteerAttendance() {
  const list = document.querySelector('[data-attendance-list]');
  if (!list) return;

  const email = phaseThreeEmail();
  const allSignups = phaseThreeSignups().filter(signup => signup.email === email && signup.status !== 'cancelled');
  const confirmedSignups = allSignups.filter(signup => signup.status === 'confirmed' || signup.status === 'completed');
  list.replaceChildren();

  if (!phaseThreeIsSignedIn()) {
    list.append(phaseThreeEmpty('Sign in to check in and check out of confirmed volunteer opportunities.'));
    return;
  }

  if (allSignups.length === 0) {
    list.append(phaseThreeEmpty('No sign-ups available for attendance yet.'));
    return;
  }

  if (confirmedSignups.length === 0) {
    list.append(phaseThreeEmpty('Only confirmed opportunities are available for check-in. Pending review and waitlisted sign-ups will appear here after admin confirmation.'));
    return;
  }

  confirmedSignups.forEach(signup => list.append(phaseThreeVolunteerRow(signup)));
}

function phaseThreeVolunteerRow(signup) {
  const claim = phaseThreeClaimForSignup(signup.id);
  const status = claim?.claimStatus || 'pending_submission';
  const isLocked = ['submitted', 'verified', 'adjusted'].includes(status);
  const isRejectedOrClarify = status === 'rejected' || status === 'clarification_requested';
  const action = status === 'checked_in' ? 'checkout' : 'checkin';
  const row = document.createElement('div');
  row.className = 'attendance-row';
  row.innerHTML = `
    <div>
      <strong>${phaseThreeEscape(signup.title)}</strong>
      <p>${phaseThreeEscape(signup.time || 'Time to be confirmed')} · ${phaseThreeEscape(signup.location || 'Location to be confirmed')}</p>
      ${claim?.checkInAt ? `<p class="attendance-note">Checked in: ${phaseThreeEscape(phaseThreeFormatTimestamp(claim.checkInAt))}</p>` : ''}
      ${claim?.checkOutAt ? `<p class="attendance-note">Checked out: ${phaseThreeEscape(phaseThreeFormatTimestamp(claim.checkOutAt))}</p>` : ''}
      ${claim?.claimedHours ? `<p class="attendance-note">Logged hours: ${phaseThreeEscape(claim.claimedHours)}h pending admin verification</p>` : ''}
      ${claim?.adminNotes ? `<p class="attendance-note">Admin note: ${phaseThreeEscape(claim.adminNotes)}</p>` : ''}
    </div>
    <span class="badge ${phaseThreeStatusClass(status)}">${phaseThreeEscape(phaseThreeClaimStatusLabel(status))}</span>
  `;

  if (!isLocked || isRejectedOrClarify) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = status === 'checked_in' ? 'button button-primary' : 'button dashboard-secondary';
    button.dataset.attendancePunch = signup.id;
    button.dataset.attendanceAction = action;
    button.textContent = status === 'checked_in' ? 'Check out' : 'Check in';
    row.append(button);
  }

  return row;
}

function phaseThreeRenderAdminQueue() {
  const card = document.querySelector('[data-attendance-card="admin"]');
  const list = document.querySelector('[data-admin-attendance-list]');
  if (!card || !list) return;

  const isAdmin = phaseThreeIsAdmin();
  card.hidden = !isAdmin;
  if (!isAdmin) return;

  const claims = phaseThreeClaims().filter(claim => claim.claimStatus === 'submitted' || claim.claimStatus === 'clarification_requested');
  list.replaceChildren();
  if (claims.length === 0) {
    list.append(phaseThreeEmpty('No attendance records awaiting admin review.'));
    return;
  }
  claims.forEach(claim => list.append(phaseThreeAdminRow(claim)));
}

function phaseThreeAdminRow(claim) {
  const systemHours = phaseThreeNormaliseHours(claim.claimedHours || 0);
  const row = document.createElement('div');
  row.className = 'attendance-row admin-attendance-row';
  row.innerHTML = `
    <div>
      <strong>${phaseThreeEscape(claim.title)}</strong>
      <p>${phaseThreeEscape(claim.volunteerName)} · ${phaseThreeEscape(claim.email)}</p>
      <p>Check in: ${phaseThreeEscape(phaseThreeFormatTimestamp(claim.checkInAt))}</p>
      <p>Check out: ${phaseThreeEscape(phaseThreeFormatTimestamp(claim.checkOutAt))}</p>
      <p>System-calculated hours: ${phaseThreeEscape(systemHours)}h</p>
      <p class="attendance-note">Check-in code entered: ${phaseThreeEscape(claim.checkInCode || 'n/a')} · Check-out code entered: ${phaseThreeEscape(claim.checkOutCode || 'n/a')}</p>
    </div>
    <form class="attendance-review-form" data-attendance-review="${phaseThreeEscape(claim.id)}">
      <label>Verified hours<input name="verifiedHours" type="number" min="0" max="24" step="0.25" value="${phaseThreeEscape(systemHours)}" data-system-hours="${phaseThreeEscape(systemHours)}"></label>
      <label>Admin notes<input name="adminNotes" placeholder="Optional note"></label>
      <div class="attendance-actions">
        <button class="button button-primary" type="submit" name="action" value="verify" data-smart-review-action>Verify</button>
        <button class="button dashboard-secondary" type="submit" name="action" value="clarify">Clarify</button>
        <button class="button dashboard-secondary" type="submit" name="action" value="reject">Reject</button>
      </div>
    </form>
  `;
  const input = row.querySelector('input[name="verifiedHours"]');
  const smartButton = row.querySelector('[data-smart-review-action]');
  const refreshButton = () => {
    const currentHours = phaseThreeNormaliseHours(input?.value || 0);
    const isAdjusted = currentHours !== systemHours;
    smartButton.textContent = isAdjusted ? 'Adjust' : 'Verify';
    smartButton.value = isAdjusted ? 'adjust' : 'verify';
  };
  input?.addEventListener('input', refreshButton);
  refreshButton();
  return row;
}

function phaseThreeEmpty(text) {
  const row = document.createElement('div');
  row.className = 'signup-empty';
  row.textContent = text;
  return row;
}

function phaseThreePromptCode(action) {
  const label = action === 'checkout' ? 'check out' : 'check in';
  const code = window.prompt(`Enter the 4-digit facilitator code to ${label}.`);
  if (code === null) return null;
  const normalized = code.trim();
  if (!PHASE_THREE_CODE_PATTERN.test(normalized)) {
    window.alert('Please enter a valid 4-digit code.');
    return null;
  }
  return normalized;
}

function phaseThreeHandlePunch(signupId, action) {
  const signup = phaseThreeSignups().find(item => item.id === signupId);
  if (!signup) return;
  if (signup.status !== 'confirmed' && signup.status !== 'completed') {
    window.alert('Only confirmed opportunities can be checked in or checked out.');
    return;
  }
  const code = phaseThreePromptCode(action);
  if (!code) return;

  const now = new Date().toISOString();
  const claims = phaseThreeClaims();
  let claim = claims.find(item => item.signupId === signupId);

  if (action === 'checkin') {
    if (!claim) {
      claim = {
        id: crypto.randomUUID(),
        signupId,
        opportunityId: signup.opportunityId,
        email: signup.email,
        volunteerName: signup.volunteerName,
        title: signup.title,
        createdAt: now
      };
      claims.push(claim);
    }

    Object.assign(claim, {
      claimStatus: 'checked_in',
      checkInAt: now,
      checkInCode: code,
      checkOutAt: '',
      checkOutCode: '',
      claimedStatus: 'checked_in',
      claimedStart: now,
      claimedEnd: '',
      claimedHours: 0,
      verifiedHours: 0,
      submittedAt: '',
      reviewedBy: '',
      reviewedAt: '',
      adminNotes: '',
      updatedAt: now
    });
  } else if (action === 'checkout') {
    if (!claim || !claim.checkInAt) {
      window.alert('No check-in timestamp found. Please check in first.');
      return;
    }
    const hours = phaseThreeHoursBetween(claim.checkInAt, now);
    Object.assign(claim, {
      claimStatus: 'submitted',
      checkOutAt: now,
      checkOutCode: code,
      claimedStatus: 'attended',
      claimedStart: claim.checkInAt,
      claimedEnd: now,
      claimedHours: hours,
      submittedAt: now,
      updatedAt: now
    });
  }

  phaseThreeWriteClaims(claims);
  phaseThreeRender();
}

function phaseThreeReviewClaim(form, submitter) {
  const claimId = form.dataset.attendanceReview;
  const data = new FormData(form);
  const enteredHours = String(data.get('verifiedHours') || '').trim();
  const systemHours = String(form.querySelector('input[name="verifiedHours"]')?.dataset.systemHours || '').trim();
  const action = submitter?.value || (enteredHours && enteredHours !== systemHours ? 'adjust' : 'verify');
  const claims = phaseThreeClaims();
  const claim = claims.find(item => item.id === claimId);
  if (!claim) return;

  const statusByAction = {
    verify: 'verified',
    adjust: 'adjusted',
    clarify: 'clarification_requested',
    reject: 'rejected'
  };
  claim.claimStatus = statusByAction[action] || 'verified';
  claim.verifiedHours = claim.claimStatus === 'rejected' || claim.claimStatus === 'clarification_requested'
    ? 0
    : Number(enteredHours || claim.claimedHours || 0);
  claim.adminNotes = String(data.get('adminNotes') || '').trim();
  claim.reviewedBy = phaseThreeEmail() || 'admin';
  claim.reviewedAt = new Date().toISOString();
  claim.updatedAt = new Date().toISOString();
  phaseThreeWriteClaims(claims);

  const signups = phaseThreeSignups();
  const signup = signups.find(item => item.id === claim.signupId);
  if (signup && (claim.claimStatus === 'verified' || claim.claimStatus === 'adjusted')) {
    signup.status = 'completed';
    signup.verifiedHours = claim.verifiedHours;
    signup.completedAt = new Date().toISOString();
    signup.updatedAt = new Date().toISOString();
    phaseThreeWriteSignups(signups);
    phaseThreePersistCompletedSignup(signup);
  }

  phaseThreeRender();
  if (typeof phaseOneRenderDashboard === 'function') phaseOneRenderDashboard();
}

function phaseThreeUpdateStats() {
  const email = phaseThreeEmail();
  const claims = phaseThreeClaims().filter(claim => claim.email === email);
  const verifiedClaims = claims.filter(claim => claim.claimStatus === 'verified' || claim.claimStatus === 'adjusted');
  const verifiedHours = verifiedClaims.reduce((total, claim) => total + Number(claim.verifiedHours || 0), 0);
  const submittedCount = claims.filter(claim => claim.claimStatus === 'submitted' || claim.claimStatus === 'clarification_requested').length;
  const hoursNode = document.querySelector('[data-stat-hours]');
  const completedNode = document.querySelector('[data-stat-completed]');
  if (hoursNode) hoursNode.textContent = String(verifiedHours);
  if (completedNode) completedNode.textContent = String(verifiedClaims.length);

  const statCard = document.querySelector('#stats-title')?.closest('.dashboard-card');
  if (statCard && !statCard.querySelector('[data-stat-pending-attendance]')) {
    const note = document.createElement('p');
    note.className = 'dashboard-muted attendance-pending-note';
    note.dataset.statPendingAttendance = 'true';
    statCard.append(note);
  }
  const pendingNode = document.querySelector('[data-stat-pending-attendance]');
  if (pendingNode) pendingNode.textContent = `${submittedCount} attendance record${submittedCount === 1 ? '' : 's'} pending admin verification.`;
}

function phaseThreeBind() {
  document.addEventListener('click', event => {
    const punchButton = event.target.closest('[data-attendance-punch]');
    if (punchButton) {
      event.preventDefault();
      phaseThreeHandlePunch(punchButton.dataset.attendancePunch, punchButton.dataset.attendanceAction);
    }
  }, true);

  document.addEventListener('submit', event => {
    const reviewForm = event.target.closest('[data-attendance-review]');
    if (reviewForm) {
      event.preventDefault();
      phaseThreeReviewClaim(reviewForm, event.submitter);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  phaseThreeBind();
  window.setTimeout(phaseThreeRender, 0);
});

window.addEventListener('storage', phaseThreeRender);
