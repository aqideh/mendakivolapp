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
      created_at: claim.createdAt || new Date().toISOString(),
      updated_at: claim.updatedAt || new Date().toISOString()
    };
  }

  function rowToClaim(row) {
    return {
      id: row.id,
      signupId: row.signup_id || '',
      opportunityId: String(row.opportunity_id || ''),
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
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  async function fetchSupabaseAttendanceClaims() {
    const supabase = client();
    if (!supabase || !session()?.email) return [];

    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Could not load Supabase attendance claims; keeping local fallback.', error);
      return window.VolunteerDataStore.getAttendanceClaims();
    }

    const claims = Array.isArray(data) ? data.map(rowToClaim) : [];
    window.VolunteerDataStore.saveAttendanceClaims(claims);
    window.dispatchEvent(new CustomEvent('volunteer-attendance-synced'));
    return claims;
  }

  async function saveSupabaseAttendanceClaim(claim, options = {}) {
    const supabase = client();
    if (!supabase || !session()?.email || !claim?.id) return { ok: false, skipped: true };

    const row = claimToRow(claim);
    const mode = options.mode || 'upsert';
    const request = mode === 'update'
      ? supabase.from(ATTENDANCE_TABLE).update(row).eq('id', claim.id)
      : supabase.from(ATTENDANCE_TABLE).upsert(row, { onConflict: 'id' });
    const { data, error } = await request.select('*').single();

    if (error) {
      console.warn('Could not save Supabase attendance claim; local fallback remains active.', error);
      return { ok: false, reason: error.message };
    }

    const saved = rowToClaim(data);
    const claims = window.VolunteerDataStore.getAttendanceClaims();
    const index = claims.findIndex(item => item.id === saved.id);
    if (index >= 0) claims[index] = saved;
    else claims.push(saved);
    window.VolunteerDataStore.saveAttendanceClaims(claims);
    window.dispatchEvent(new CustomEvent('volunteer-attendance-synced'));
    return { ok: true, claim: saved };
  }

  function claimBySignupId(signupId) {
    return window.VolunteerDataStore.getAttendanceClaims().find(item => item.signupId === signupId);
  }

  function claimById(claimId) {
    return window.VolunteerDataStore.getAttendanceClaims().find(item => item.id === claimId);
  }

  function persistClaim(claim, options = {}) {
    if (!claim) return Promise.resolve({ ok: false, reason: 'missing_claim' });
    return saveSupabaseAttendanceClaim(claim, options).then(result => {
      if (result?.ok) return fetchSupabaseAttendanceClaims();
      return result;
    });
  }

  function refreshAttendanceViews() {
    if (typeof phaseThreeRender === 'function') phaseThreeRender();
    if (typeof phaseOneRenderDashboard === 'function') phaseOneRenderDashboard();
  }

  function installClickPersistence() {
    if (window.__phaseNineAttendanceClickPersistenceInstalled) return;
    window.__phaseNineAttendanceClickPersistenceInstalled = true;

    document.addEventListener('click', event => {
      const punchButton = event.target.closest('[data-attendance-punch]');
      if (!punchButton) return;
      const signupId = punchButton.dataset.attendancePunch;
      window.setTimeout(() => persistClaim(claimBySignupId(signupId), { mode: 'upsert' }), 0);
    }, true);
  }

  function installSubmitPersistence() {
    if (window.__phaseNineAttendanceSubmitPersistenceInstalled) return;
    window.__phaseNineAttendanceSubmitPersistenceInstalled = true;

    document.addEventListener('submit', event => {
      const form = event.target.closest('[data-attendance-review]');
      if (!form) return;
      const claimId = form.dataset.attendanceReview;
      window.setTimeout(() => persistClaim(claimById(claimId), { mode: 'update' }), 0);
    }, true);
  }

  async function syncAndRender() {
    if (!isReady()) return;
    await fetchSupabaseAttendanceClaims();
    refreshAttendanceViews();
  }

  Object.assign(window.VolunteerDataStore, {
    fetchSupabaseAttendanceClaims,
    saveSupabaseAttendanceClaim
  });

  window.addEventListener('volunteer-auth-ready', syncAndRender);
  window.addEventListener('volunteer-auth-changed', syncAndRender);
  window.addEventListener('volunteer-attendance-synced', refreshAttendanceViews);
  window.addEventListener('volunteer-signups-synced', syncAndRender);

  document.addEventListener('DOMContentLoaded', () => {
    installClickPersistence();
    installSubmitPersistence();
    window.setTimeout(syncAndRender, 220);
  });
})();
