const PHASE_THREE_ATTENDANCE_KEY = 'mendaki.volunteer.attendance.v1';

function phaseThreeReadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch (error) {
    console.warn(`Could not parse ${key}`, error);
    return null;
  }
}

function phaseThreeWriteJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function phaseThreeClaims() {
  const value = phaseThreeReadJson(PHASE_THREE_ATTENDANCE_KEY);
  return Array.isArray(value) ? value : [];
}

function phaseThreeWriteClaims(claims) {
  phaseThreeWriteJson(PHASE_THREE_ATTENDANCE_KEY, claims);
}

function phaseThreeProfile() {
  return phaseThreeReadJson('mendaki.volunteer.profile.v1') || {};
}

function phaseThreeSession() {
  return phaseThreeReadJson('mendaki.volunteer.session.v1') || {};
}

function phaseThreeSignups() {
  const value = phaseThreeReadJson('mendaki.volunteer.signups.v1');
  return Array.isArray(value) ? value : [];
}

function phaseThreeWriteSignups(signups) {
  phaseThreeWriteJson('mendaki.volunteer.signups.v1', signups);
}

function phaseThreeEmail() {
  return phaseThreeProfile().email || phaseThreeSession().email || '';
}

function phaseThreeIsSignedIn() {
  return Boolean(phaseThreeEmail());
}

function phaseThreeIsAdmin() {
  const role = String(phaseThreeSession().role || '').toLowerCase();
  const email = phaseThreeEmail().toLowerCase();
  return role === 'admin' || role === 'super_admin' || email.includes('+admin@') || email.startsWith('admin@');
}

function phaseThreeClaimForSignup(signupId) {
  return phaseThreeClaims().find(claim => claim.signupId === signupId);
}

function phaseThreeClaimStatusLabel(status) {
  const labels = {
    pending_submission: 'Pending submission',
    submitted: 'Submitted',
    clarification_requested: 'Clarification requested',
    verified: 'Verified',
    adjusted: 'Adjusted',
    rejected: 'Rejected',
    no_show: 'No-show'
  };
  return labels[status] || status || 'Pending submission';
}

function phaseThreeStatusClass(status) {
  if (status === 'verified' || status === 'adjusted') return 'badge-open';
  if (status === 'rejected' || status === 'no_show') return 'badge-ad-hoc';
  if (status === 'submitted') return 'badge-programme';
  return 'badge-volunteer';
}

function phaseThreeEscape(value) {
  return String(value || '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
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
        <h2>Attendance self-reporting</h2>
        <p class="dashboard-muted">Submit your attendance after completing a volunteer opportunity. Admins will validate official hours.</p>
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
        <p class="dashboard-muted">Review volunteer self-reported attendance and validate final verified hours.</p>
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
  const signups = phaseThreeSignups().filter(signup => signup.email === email && signup.status !== 'cancelled');
  list.replaceChildren();

  if (!phaseThreeIsSignedIn()) {
    list.append(phaseThreeEmpty('Sign in to self-report attendance.'));
    return;
  }

  if (signups.length === 0) {
    list.append(phaseThreeEmpty('No sign-ups available for attendance reporting yet.'));
    return;
  }

  signups.forEach(signup => list.append(phaseThreeVolunteerRow(signup)));
}

function phaseThreeVolunteerRow(signup) {
  const claim = phaseThreeClaimForSignup(signup.id);
  const status = claim?.claimStatus || 'pending_submission';
  const row = document.createElement('div');
  row.className = 'attendance-row';
  row.innerHTML = `
    <div>
      <strong>${phaseThreeEscape(signup.title)}</strong>
      <p>${phaseThreeEscape(signup.time || 'Time to be confirmed')} · ${phaseThreeEscape(signup.location || 'Location to be confirmed')}</p>
      ${claim?.volunteerNotes ? `<p class="attendance-note">Note: ${phaseThreeEscape(claim.volunteerNotes)}</p>` : ''}
    </div>
    <span class="badge ${phaseThreeStatusClass(status)}">${phaseThreeEscape(phaseThreeClaimStatusLabel(status))}</span>
  `;

  if (!claim || status === 'clarification_requested' || status === 'rejected') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button dashboard-secondary';
    button.dataset.attendanceReport = signup.id;
    button.textContent = claim ? 'Resubmit' : 'Report attendance';
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
    list.append(phaseThreeEmpty('No attendance claims awaiting admin review.'));
    return;
  }
  claims.forEach(claim => list.append(phaseThreeAdminRow(claim)));
}

function phaseThreeAdminRow(claim) {
  const row = document.createElement('div');
  row.className = 'attendance-row admin-attendance-row';
  row.innerHTML = `
    <div>
      <strong>${phaseThreeEscape(claim.title)}</strong>
      <p>${phaseThreeEscape(claim.volunteerName)} · ${phaseThreeEscape(claim.email)}</p>
      <p>Claimed ${phaseThreeEscape(claim.claimedHours)} hours (${phaseThreeEscape(claim.claimedStart || 'start n/a')} to ${phaseThreeEscape(claim.claimedEnd || 'end n/a')})</p>
      ${claim.volunteerNotes ? `<p class="attendance-note">Volunteer note: ${phaseThreeEscape(claim.volunteerNotes)}</p>` : ''}
    </div>
    <form class="attendance-review-form" data-attendance-review="${phaseThreeEscape(claim.id)}">
      <label>Verified hours<input name="verifiedHours" type="number" min="0" max="24" step="0.25" value="${phaseThreeEscape(claim.claimedHours || '')}" required></label>
      <label>Admin notes<input name="adminNotes" placeholder="Optional note"></label>
      <div class="attendance-actions">
        <button class="button button-primary" type="submit" name="action" value="verify">Verify</button>
        <button class="button dashboard-secondary" type="submit" name="action" value="adjust">Adjust</button>
        <button class="button dashboard-secondary" type="submit" name="action" value="clarify">Clarify</button>
        <button class="button dashboard-secondary" type="submit" name="action" value="reject">Reject</button>
      </div>
    </form>
  `;
  return row;
}

function phaseThreeEmpty(text) {
  const row = document.createElement('div');
  row.className = 'signup-empty';
  row.textContent = text;
  return row;
}

function phaseThreeOpenReportForm(signupId) {
  const signup = phaseThreeSignups().find(item => item.id === signupId);
  if (!signup) return;
  const existing = phaseThreeClaimForSignup(signupId);
  const modal = document.querySelector('#modal');
  const layer = document.querySelector('#modal-layer');
  if (!modal || !layer) return;

  modal.replaceChildren();
  modal.innerHTML = `
    <div class="modal-hero">
      <button type="button" class="close-button" aria-label="Close dialog" data-close-modal="true">×</button>
      <span class="badge badge-programme">Attendance</span>
      <h2 id="modal-title">Report attendance</h2>
    </div>
    <form class="modal-body attendance-report-form" data-attendance-report-form="${phaseThreeEscape(signupId)}">
      <section class="modal-section">
        <h3>${phaseThreeEscape(signup.title)}</h3>
        <p>${phaseThreeEscape(signup.time || 'Time to be confirmed')} · ${phaseThreeEscape(signup.location || 'Location to be confirmed')}</p>
      </section>
      <div class="attendance-form-grid">
        <label>Status<select name="claimedStatus" required><option value="attended">Attended</option><option value="partially_attended">Partially attended</option><option value="unable_to_attend">Unable to attend</option></select></label>
        <label>Claimed hours<input name="claimedHours" type="number" min="0" max="24" step="0.25" value="${phaseThreeEscape(existing?.claimedHours || signup.hours || '')}" required></label>
        <label>Start time<input name="claimedStart" type="time" value="${phaseThreeEscape(existing?.claimedStart || '')}"></label>
        <label>End time<input name="claimedEnd" type="time" value="${phaseThreeEscape(existing?.claimedEnd || '')}"></label>
      </div>
      <label class="attendance-notes-label">Notes<textarea name="volunteerNotes" rows="4" placeholder="Add context for admin review, if needed.">${phaseThreeEscape(existing?.volunteerNotes || '')}</textarea></label>
      <div class="modal-actions">
        <button class="button button-primary" type="submit">Submit for verification</button>
        <button class="button" type="button" data-close-modal="true">Cancel</button>
      </div>
    </form>
  `;
  layer.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.focus({ preventScroll: true }));
}

function phaseThreeSubmitClaim(form) {
  const signupId = form.dataset.attendanceReportForm;
  const signup = phaseThreeSignups().find(item => item.id === signupId);
  if (!signup) return;

  const data = new FormData(form);
  const claims = phaseThreeClaims();
  const existing = claims.find(claim => claim.signupId === signupId);
  const record = {
    id: existing?.id || crypto.randomUUID(),
    signupId,
    opportunityId: signup.opportunityId,
    email: signup.email,
    volunteerName: signup.volunteerName,
    title: signup.title,
    claimedStatus: String(data.get('claimedStatus') || 'attended'),
    claimStatus: 'submitted',
    claimedStart: String(data.get('claimedStart') || ''),
    claimedEnd: String(data.get('claimedEnd') || ''),
    claimedHours: Number(data.get('claimedHours') || 0),
    volunteerNotes: String(data.get('volunteerNotes') || '').trim(),
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existing) Object.assign(existing, record);
  else claims.push(record);
  phaseThreeWriteClaims(claims);
  phaseThreeRender();
  phaseThreeCloseModal();
}

function phaseThreeReviewClaim(form, submitter) {
  const claimId = form.dataset.attendanceReview;
  const data = new FormData(form);
  const action = submitter?.value || 'verify';
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
    : Number(data.get('verifiedHours') || claim.claimedHours || 0);
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
  if (pendingNode) pendingNode.textContent = `${submittedCount} attendance claim${submittedCount === 1 ? '' : 's'} pending admin action.`;
}

function phaseThreeCloseModal() {
  const layer = document.querySelector('#modal-layer');
  const modal = document.querySelector('#modal');
  if (layer) layer.hidden = true;
  if (modal) modal.replaceChildren();
  document.body.style.overflow = '';
}

function phaseThreeBind() {
  document.addEventListener('click', event => {
    const reportButton = event.target.closest('[data-attendance-report]');
    if (reportButton) {
      event.preventDefault();
      phaseThreeOpenReportForm(reportButton.dataset.attendanceReport);
    }
  }, true);

  document.addEventListener('submit', event => {
    const reportForm = event.target.closest('[data-attendance-report-form]');
    if (reportForm) {
      event.preventDefault();
      phaseThreeSubmitClaim(reportForm);
      return;
    }

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
