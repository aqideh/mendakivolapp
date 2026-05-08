(() => {
  function getClaims() {
    return window.VolunteerDataStore?.getAttendanceClaims?.() || [];
  }

  function getSignups() {
    return window.VolunteerDataStore?.getOpportunitySignups?.() || [];
  }

  function saveSignups(signups) {
    window.VolunteerDataStore?.saveOpportunitySignups?.(signups);
  }

  function isApprovedClaim(claim) {
    return claim?.claimStatus === 'verified' || claim?.claimStatus === 'adjusted';
  }

  async function saveRemoteSignup(signup) {
    if (typeof window.phaseTwoPersistSignupChange === 'function') {
      await window.phaseTwoPersistSignupChange(signup, { mode: 'update' });
      return;
    }

    if (typeof window.VolunteerDataStore?.saveSupabaseOpportunitySignup === 'function') {
      await window.VolunteerDataStore.saveSupabaseOpportunitySignup(signup, { mode: 'update' });
      if (typeof window.VolunteerDataStore.fetchSupabaseOpportunitySignups === 'function') {
        await window.VolunteerDataStore.fetchSupabaseOpportunitySignups();
      }
      return;
    }

    window.dispatchEvent(new CustomEvent('volunteer-signups-synced'));
  }

  async function updateSignupFromClaim(claimId) {
    const claim = getClaims().find(item => item.id === claimId);
    if (!isApprovedClaim(claim)) return;

    const signups = getSignups();
    const index = signups.findIndex(item => item.id === claim.signupId);
    if (index < 0) return;

    const now = new Date().toISOString();
    const signup = {
      ...signups[index],
      status: 'completed',
      verifiedHours: Number(claim.verifiedHours || claim.claimedHours || 0),
      completedAt: signups[index].completedAt || now,
      updatedAt: now
    };

    signups[index] = signup;
    saveSignups(signups);
    await saveRemoteSignup(signup);
    window.dispatchEvent(new CustomEvent('volunteer-signups-synced'));
  }

  function bindAttendanceReviewBridge() {
    if (window.__attendanceCompletionBridgeInstalled) return;
    window.__attendanceCompletionBridgeInstalled = true;

    document.addEventListener('submit', event => {
      const form = event.target.closest('[data-attendance-review]');
      if (!form) return;
      const claimId = form.dataset.attendanceReview;
      window.setTimeout(() => updateSignupFromClaim(claimId), 120);
    }, true);
  }

  document.addEventListener('DOMContentLoaded', bindAttendanceReviewBridge);
  window.addEventListener('volunteer-auth-ready', bindAttendanceReviewBridge);
})();
