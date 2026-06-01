(() => {
  const ATTENDANCE_TABLE = 'app_attendance_claims';

  function client() {
    return window.VolunteerDataStore?.authState?.supabase || null;
  }

  function session() {
    return window.VolunteerDataStore?.getSession?.() || null;
  }

  function isReady() {
    return Boolean(client() && session()?.email);
  }

  function claimToRow(claim) {
    return {
      id: claim.id,
      signup_id: claim.signupId || null,
      opportunity_id: String(claim.opportunityId || ''),
      session_id: claim.sessionId || null,
      email: claim.email || session()?.email || '',
      volunteer_name: claim.volunteerName || session()?.name || 'Volunteer',
      title: claim.title || '',
      claim_status: claim.claimStatus || 'pending_submission',
      check_in_at: claim.checkInAt || null,
      check_in_code: claim.checkInCode || null,
      check_out_at: claim.checkOutAt || null,
      check_out_code: claim.checkOutCode || null,
      claimed_status: claim.claimedStatus || null,
      claimed_start: claim.claimedStart || null,
      claimed_end: claim.claimedEnd || null,
      claimed_hours: Number(claim.claimedHours || 0),
      verified_hours: Number(claim.verifiedHours || 0),
      submitted_at: claim.submittedAt || null,
      reviewed_by_email: claim.reviewedBy || null,
      reviewed_at: claim.reviewedAt || null,
      admin_notes: claim.adminNotes || null,
      clarification_response: claim.clarificationResponse || null,
      clarification_responded_at: claim.clarificationRespondedAt || null,
      created_at: claim.createdAt || new Date().toISOString(),
      updated_at: claim.updatedAt || new Date().toISOString()
    };
  }

  function rowToClaim(row) {
    return {
      id: row.id,
      signupId: row.signup_id || '',
      opportunityId: String(row.opportunity_id || ''),
      sessionId: row.session_id || '',
      email: row.email || '',
      volunteerName: row.volunteer_name || 'Volunteer',
      title: row.title || '',
      claimStatus: row.claim_status || 'pending_submission',
      checkInAt: row.check_in_at || '',
      checkInCode: row.check_in_code || '',
      checkOutAt: row.check_out_at || '',
      checkOutCode: row.check_out_code || '',
      claimedStatus: row.claimed_status || '',
      claimedStart: row.claimed_start || '',
      claimedEnd: row.claimed_end || '',
      claimedHours: Number(row.claimed_hours || 0),
      verifiedHours: Number(row.verified_hours || 0),
      submittedAt: row.submitted_at || '',
      reviewedBy: row.reviewed_by_email || '',
      reviewedAt: row.reviewed_at || '',
      adminNotes: row.admin_notes || '',
      clarificationResponse: row.clarification_response || '',
      clarificationRespondedAt: row.clarification_responded_at || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function actionFromClaimStatus(status) {
    if (status === 'verified') return 'verify';
    if (status === 'adjusted') return 'adjust';
    if (status === 'clarification_requested') return 'clarify';
    if (status === 'rejected') return 'reject';
    return '';
  }

  function requireSupabaseAttendance() {
    if (!client()) throw new Error('Supabase is required for attendance persistence. No local fallback is allowed.');
    if (!session()?.email) throw new Error('A signed-in session is required for attendance persistence.');
  }

  async function fetchSupabaseAttendanceClaims() {
    requireSupabaseAttendance();

    const { data, error } = await client()
      .from(ATTENDANCE_TABLE)
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Could not load Supabase attendance claims: ${error.message}`);

    const claims = Array.isArray(data) ? data.map(rowToClaim) : [];
    window.VolunteerDataStore.saveAttendanceClaims(claims);
    window.dispatchEvent(new CustomEvent('volunteer-attendance-synced'));
    return claims;
  }

  async function notifySavedAttendanceClaim(saved) {
    const reviewStatuses = ['verified', 'adjusted', 'clarification_requested', 'rejected'];
    if (!reviewStatuses.includes(saved?.claimStatus)) return;
    if (typeof window.VolunteerDataStore?.notifyAttendanceReview !== 'function') return;
    await window.VolunteerDataStore.notifyAttendanceReview(saved);
  }

  async function reviewAttendanceClaimTransactionally(claim) {
    requireSupabaseAttendance();
    if (!claim?.id) throw new Error('Attendance claim id is required for transactional review.');
    if (!window.VolunteerDataStore?.isAdmin?.()) throw new Error('Admin access is required for attendance review.');

    const action = actionFromClaimStatus(claim.claimStatus);
    if (!action) throw new Error(`Unsupported attendance review status: ${claim.claimStatus || 'missing'}.`);

    const { error } = await client().rpc('review_attendance_claim_transactional', {
      p_claim_id: claim.id,
      p_action: action,
      p_verified_hours: Number(claim.verifiedHours || 0),
      p_admin_notes: claim.adminNotes || null
    });

    if (error) throw new Error(`Transactional attendance review failed: ${error.message}`);

    await fetchSupabaseAttendanceClaims();
    if (typeof window.VolunteerDataStore?.fetchSupabaseOpportunitySignups === 'function') {
      await window.VolunteerDataStore.fetchSupabaseOpportunitySignups();
    }
    if (typeof window.VolunteerDataStore?.fetchNotifications === 'function') {
      await window.VolunteerDataStore.fetchNotifications();
    }
    return { ok: true, transactional: true };
  }

  async function saveSupabaseAttendanceClaim(claim, options = {}) {
    requireSupabaseAttendance();
    if (!claim?.id) throw new Error('Attendance claim id is required for persistence.');

    const isVolunteerClarification = options.clarificationResponse === true;
    const isAdminReview = options.review === true || ['verified', 'adjusted', 'clarification_requested', 'rejected'].includes(claim.claimStatus);
    if (!isVolunteerClarification && isAdminReview && window.VolunteerDataStore?.isAdmin?.()) {
      return reviewAttendanceClaimTransactionally(claim);
    }

    const row = claimToRow(claim);
    const mode = options.mode || 'upsert';
    const request = mode === 'update'
      ? client().from(ATTENDANCE_TABLE).update(row).eq('id', claim.id)
      : client().from(ATTENDANCE_TABLE).upsert(row, { onConflict: 'id' });
    const { data, error } = await request.select('*').single();

    if (error) throw new Error(`Could not save Supabase attendance claim: ${error.message}`);

    const saved = rowToClaim(data);
    const claims = window.VolunteerDataStore.getAttendanceClaims();
    const index = claims.findIndex(item => item.id === saved.id);
    if (index >= 0) claims[index] = saved;
    else claims.push(saved);
    window.VolunteerDataStore.saveAttendanceClaims(claims);
    window.dispatchEvent(new CustomEvent('volunteer-attendance-synced'));
    if (!isVolunteerClarification) await notifySavedAttendanceClaim(saved);
    return { ok: true, claim: saved };
  }

  function claimBySignupId(signupId) {
    return window.VolunteerDataStore.getAttendanceClaims().find(item => item.signupId === signupId);
  }

  function claimById(claimId) {
    return window.VolunteerDataStore.getAttendanceClaims().find(item => item.id === claimId);
  }

  function showAttendancePersistenceError(error) {
    const message = error?.message || String(error || 'Attendance persistence failed.');
    console.error(message, error);
    window.alert(message);
  }

  function persistClaim(claim, options = {}) {
    if (!claim) return Promise.reject(new Error('Attendance claim is missing.'));
    return saveSupabaseAttendanceClaim(claim, options).then(result => {
      if (result?.ok && !result.transactional) return fetchSupabaseAttendanceClaims();
      return result;
    });
  }

  function refreshAttendanceViews() {
    if (typeof phaseThreeRender === 'function') phaseThreeRender();
    if (typeof phaseOneRenderDashboard === 'function') phaseOneRenderDashboard();
    if (window.MENDAKIVolunteerStats?.renderVolunteerStatsFromAttendanceClaims) {
      window.MENDAKIVolunteerStats.renderVolunteerStatsFromAttendanceClaims();
    }
  }

  function installClickPersistence() {
    if (window.__phaseNineAttendanceClickPersistenceInstalled) return;
    window.__phaseNineAttendanceClickPersistenceInstalled = true;

    document.addEventListener('click', event => {
      const punchButton = event.target.closest('[data-attendance-punch]');
      if (!punchButton) return;
      const signupId = punchButton.dataset.attendancePunch;
      window.setTimeout(() => {
        persistClaim(claimBySignupId(signupId), { mode: 'upsert' }).catch(showAttendancePersistenceError);
      }, 0);
    }, true);
  }

  function installSubmitPersistence() {
    if (window.__phaseNineAttendanceSubmitPersistenceInstalled) return;
    window.__phaseNineAttendanceSubmitPersistenceInstalled = true;

    document.addEventListener('submit', event => {
      const clarificationForm = event.target.closest('[data-attendance-clarification-response]');
      if (clarificationForm) return;
      const form = event.target.closest('[data-attendance-review]');
      if (!form) return;
      const claimId = form.dataset.attendanceReview;
      window.setTimeout(() => {
        persistClaim(claimById(claimId), { mode: 'update', review: true }).catch(showAttendancePersistenceError);
      }, 0);
    }, true);
  }

  async function syncAndRender() {
    if (!isReady()) return;
    await fetchSupabaseAttendanceClaims();
    refreshAttendanceViews();
  }

  Object.assign(window.VolunteerDataStore, {
    fetchSupabaseAttendanceClaims,
    saveSupabaseAttendanceClaim,
    reviewAttendanceClaimTransactionally
  });

  window.addEventListener('volunteer-auth-ready', () => syncAndRender().catch(showAttendancePersistenceError));
  window.addEventListener('volunteer-auth-changed', () => syncAndRender().catch(showAttendancePersistenceError));
  window.addEventListener('volunteer-attendance-synced', refreshAttendanceViews);
  window.addEventListener('volunteer-signups-synced', () => syncAndRender().catch(showAttendancePersistenceError));

  document.addEventListener('DOMContentLoaded', () => {
    installClickPersistence();
    installSubmitPersistence();
    window.setTimeout(() => syncAndRender().catch(showAttendancePersistenceError), 220);
  });
})();
