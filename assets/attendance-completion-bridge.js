(() => {
  const VERIFIED_STAT_SELECTOR = '[data-stat-hours]';
  const COMPLETED_STAT_SELECTOR = '[data-stat-completed]';
  const PENDING_STAT_SELECTOR = '[data-stat-pending-attendance]';

  function store() {
    return window.VolunteerDataStore || null;
  }

  function currentEmail() {
    return store()?.currentEmail?.() || store()?.getSession?.()?.email || '';
  }

  function attendanceClaims() {
    return store()?.getAttendanceClaims?.() || [];
  }

  function opportunitySignups() {
    return store()?.getOpportunitySignups?.() || [];
  }

  function formatHours(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) return '0';
    return String(Math.round(number * 100) / 100);
  }

  function claimsForCurrentVolunteer() {
    const email = currentEmail();
    if (!email) return [];
    return attendanceClaims().filter(claim => claim.email === email);
  }

  function verifiedClaimsForCurrentVolunteer() {
    return claimsForCurrentVolunteer().filter(claim => claim.claimStatus === 'verified' || claim.claimStatus === 'adjusted');
  }

  function ensurePendingAttendanceNode() {
    const statCard = document.querySelector('#stats-title')?.closest('.dashboard-card');
    if (!statCard) return null;
    let pendingNode = statCard.querySelector(PENDING_STAT_SELECTOR);
    if (!pendingNode) {
      pendingNode = document.createElement('p');
      pendingNode.className = 'dashboard-muted attendance-pending-note';
      pendingNode.dataset.statPendingAttendance = 'true';
      statCard.append(pendingNode);
    }
    return pendingNode;
  }

  function legacySignupDerivedHours() {
    const email = currentEmail();
    if (!email) return 0;
    return opportunitySignups()
      .filter(item => item.email === email && item.status === 'completed')
      .reduce((total, item) => total + Number(item.verifiedHours || item.hours || 0), 0);
  }

  function renderVolunteerStatsFromAttendanceClaims() {
    const claims = claimsForCurrentVolunteer();
    const verifiedClaims = verifiedClaimsForCurrentVolunteer();
    const verifiedHours = verifiedClaims.reduce((total, claim) => total + Number(claim.verifiedHours || 0), 0);
    const submittedCount = claims.filter(claim => claim.claimStatus === 'submitted' || claim.claimStatus === 'clarification_requested').length;

    const hoursNode = document.querySelector(VERIFIED_STAT_SELECTOR);
    const completedNode = document.querySelector(COMPLETED_STAT_SELECTOR);
    if (hoursNode) hoursNode.textContent = formatHours(verifiedHours);
    if (completedNode) completedNode.textContent = String(verifiedClaims.length);

    const pendingNode = ensurePendingAttendanceNode();
    if (pendingNode) pendingNode.textContent = `${submittedCount} attendance record${submittedCount === 1 ? '' : 's'} pending admin verification.`;

    const signupHours = legacySignupDerivedHours();
    if (Math.abs(signupHours - verifiedHours) > 0.001) {
      console.warn('Verified hours mismatch: attendance claims are the canonical source.', {
        email: currentEmail(),
        attendanceClaimHours: verifiedHours,
        legacySignupDerivedHours: signupHours,
        difference: signupHours - verifiedHours
      });
    }

    return { verifiedHours, completedCount: verifiedClaims.length, submittedCount };
  }

  function wrapDashboardRenderer(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.__canonicalStatsWrapped) return;
    const wrapped = function wrappedDashboardRenderer(...args) {
      const result = original.apply(this, args);
      renderVolunteerStatsFromAttendanceClaims();
      return result;
    };
    wrapped.__canonicalStatsWrapped = true;
    window[name] = wrapped;
  }

  function installCanonicalStatsRenderer() {
    wrapDashboardRenderer('phaseTwoRenderDashboardSignups');
    wrapDashboardRenderer('phaseThreeUpdateStats');
    renderVolunteerStatsFromAttendanceClaims();
  }

  window.MENDAKIVolunteerStats = Object.freeze({
    renderVolunteerStatsFromAttendanceClaims
  });

  document.addEventListener('DOMContentLoaded', () => {
    installCanonicalStatsRenderer();
    window.setTimeout(installCanonicalStatsRenderer, 0);
    window.setTimeout(renderVolunteerStatsFromAttendanceClaims, 300);
  });

  [
    'volunteer-auth-ready',
    'volunteer-auth-changed',
    'volunteer-attendance-synced',
    'volunteer-signups-synced'
  ].forEach(eventName => {
    window.addEventListener(eventName, () => window.setTimeout(installCanonicalStatsRenderer, 0));
  });

  window.addEventListener('storage', event => {
    if (!event?.key || event.key === store()?.keys?.attendanceClaims || event.key === store()?.keys?.opportunitySignups) {
      window.setTimeout(renderVolunteerStatsFromAttendanceClaims, 0);
    }
  });
})();
