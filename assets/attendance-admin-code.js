const ATTENDANCE_ADMIN_CODE_KEY = 'mendaki.volunteer.attendance.v1';

function attendanceAdminCodeReadClaims() {
  try {
    const value = JSON.parse(localStorage.getItem(ATTENDANCE_ADMIN_CODE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn('Could not parse attendance claims', error);
    return [];
  }
}

function attendanceAdminCodeWriteClaims(claims) {
  localStorage.setItem(ATTENDANCE_ADMIN_CODE_KEY, JSON.stringify(claims));
}

function attendanceAdminCodeFindClaim(claimId) {
  return attendanceAdminCodeReadClaims().find(claim => claim.id === claimId);
}

function attendanceAdminCodeMatches(claim, code) {
  if (!claim || !code) return false;
  return claim.checkInCode === code && claim.checkOutCode === code;
}

function attendanceAdminCodeStatusText(claim, code) {
  if (!code) return 'Enter the facilitator code used for this volunteering session.';
  return attendanceAdminCodeMatches(claim, code)
    ? 'Code matches both volunteer check-in and check-out entries.'
    : 'Code does not match both recorded volunteer entries.';
}

function attendanceAdminCodeEnhanceForm(form) {
  if (!form || form.dataset.facilitatorCodeReady === 'true') return;
  const claim = attendanceAdminCodeFindClaim(form.dataset.attendanceReview);
  const existingCode = claim?.facilitatorCode || '';

  const label = document.createElement('label');
  label.className = 'facilitator-code-field';
  label.append(document.createTextNode('Facilitator code'));

  const input = document.createElement('input');
  input.name = 'facilitatorCode';
  input.inputMode = 'numeric';
  input.maxLength = 4;
  input.pattern = '\\d{4}';
  input.placeholder = '4-digit code';
  input.value = existingCode;

  const help = document.createElement('span');
  help.className = 'facilitator-code-help';
  help.textContent = attendanceAdminCodeStatusText(claim, existingCode);

  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
    help.textContent = attendanceAdminCodeStatusText(claim, input.value);
  });

  label.append(input, help);
  const firstField = form.querySelector('label');
  if (firstField) firstField.insertAdjacentElement('afterend', label);
  else form.prepend(label);
  form.dataset.facilitatorCodeReady = 'true';
}

function attendanceAdminCodeEnhanceForms() {
  document.querySelectorAll('[data-attendance-review]').forEach(attendanceAdminCodeEnhanceForm);
}

function attendanceAdminCodePatchReview() {
  if (typeof phaseThreeReviewClaim !== 'function' || phaseThreeReviewClaim.attendanceCodePatched) return;
  const originalReview = phaseThreeReviewClaim;
  phaseThreeReviewClaim = function patchedPhaseThreeReviewClaim(form, submitter) {
    const claimId = form?.dataset?.attendanceReview;
    const code = String(new FormData(form).get('facilitatorCode') || '').trim();
    originalReview(form, submitter);

    if (!claimId) return;
    const claims = attendanceAdminCodeReadClaims();
    const claim = claims.find(item => item.id === claimId);
    if (!claim) return;
    claim.facilitatorCode = code;
    claim.facilitatorCodeMatched = attendanceAdminCodeMatches(claim, code);
    claim.facilitatorCodeReviewedAt = new Date().toISOString();
    attendanceAdminCodeWriteClaims(claims);
  };
  phaseThreeReviewClaim.attendanceCodePatched = true;
}

const attendanceAdminCodeObserver = new MutationObserver(attendanceAdminCodeEnhanceForms);

document.addEventListener('DOMContentLoaded', () => {
  attendanceAdminCodePatchReview();
  attendanceAdminCodeEnhanceForms();
  attendanceAdminCodeObserver.observe(document.body, { childList: true, subtree: true });
});

window.addEventListener('storage', attendanceAdminCodeEnhanceForms);
