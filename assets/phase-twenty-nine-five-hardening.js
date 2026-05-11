(() => {
  if (window.__phaseTwentyNineFiveHardeningInstalled) return;
  window.__phaseTwentyNineFiveHardeningInstalled = true;

  function store() { return window.VolunteerDataStore; }
  function client() { return store()?.authState?.supabase || null; }
  function session() { return store()?.getSession?.() || null; }
  function ready() { return Boolean(client() && session()?.email); }
  function setBusy(button, busy, label = 'Saving...') {
    if (!button) return;
    if (busy) {
      button.dataset.phase295OriginalText = button.textContent || '';
      button.disabled = true;
      button.textContent = label;
    } else {
      button.disabled = false;
      if (button.dataset.phase295OriginalText) button.textContent = button.dataset.phase295OriginalText;
      delete button.dataset.phase295OriginalText;
    }
  }
  function hoursBetween(startValue, endValue) {
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
    return Math.round(((end - start) / 36e5) * 100) / 100;
  }
  function refreshAll() {
    if (typeof phaseThreeRender === 'function') phaseThreeRender();
    if (typeof phaseTwoRenderDashboardSignups === 'function') phaseTwoRenderDashboardSignups();
    if (typeof phaseOneRenderDashboard === 'function') phaseOneRenderDashboard();
    if (typeof renderOpportunities === 'function') renderOpportunities();
  }
  function upsertLocal(list, item, matcher) {
    const index = list.findIndex(matcher);
    if (index >= 0) list[index] = item;
    else list.push(item);
    return list;
  }
  function claimFromRow(row) {
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
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }
  async function refreshAttendanceClaims() {
    const supabase = client();
    if (!supabase) return [];
    const { data, error } = await supabase.from('app_attendance_claims').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(claimFromRow) : [];
    store().saveAttendanceClaims(rows);
    window.dispatchEvent(new CustomEvent('volunteer-attendance-synced'));
    return rows;
  }
  function defaultSessionIdForOpportunity(opportunityId) {
    return window.MENDAKIOpportunitySessions?.defaultForOpportunity?.(opportunityId)?.id || '';
  }
  function resolveSignup(button) {
    const signupId = button?.dataset?.attendancePunch || '';
    return (store()?.getOpportunitySignups?.() || []).find(item => item.id === signupId) || null;
  }
  function resolveSessionId(signup, existing) {
    return signup?.sessionId || existing?.sessionId || defaultSessionIdForOpportunity(signup?.opportunityId) || '';
  }
  async function validateCode(signup, sessionId, code) {
    if (typeof store()?.validateAttendanceCode === 'function') {
      return store().validateAttendanceCode(signup.opportunityId, code, {
        signup,
        sessionId,
        allowOpportunityFallback: true
      });
    }
    const { data, error } = await client().rpc('validate_session_attendance_code', {
      p_opportunity_id: String(signup.opportunityId || ''),
      p_session_id: sessionId || null,
      p_code: String(code || ''),
      p_allow_opportunity_fallback: true
    });
    if (error) return { ok: false, reason: error.message };
    if (data === true || data?.ok === true) return { ok: true };
    return { ok: false, reason: 'Invalid facilitator code.' };
  }
  async function handleAttendancePunch(button) {
    const signup = resolveSignup(button);
    if (!signup) return;
    const action = button.dataset.attendanceAction || 'checkin';
    const existing = (store()?.getAttendanceClaims?.() || []).find(item => item.signupId === signup.id);
    const resolvedSessionId = resolveSessionId(signup, existing);

    if (!resolvedSessionId) {
      window.alert('This sign-up has no session attached. Please refresh your sign-ups before checking attendance.');
      return;
    }

    const code = window.prompt(`Enter the 4-digit facilitator code to ${action === 'checkout' ? 'check out' : 'check in'}.`);
    if (code === null) return;
    const normalized = code.trim();
    if (!/^\d{4}$/.test(normalized)) return window.alert('Please enter a valid 4-digit code.');

    const validation = await validateCode(signup, resolvedSessionId, normalized);
    if (!validation.ok) return window.alert(validation.reason || 'Invalid facilitator code.');

    const now = new Date().toISOString();
    if (action === 'checkout' && !existing?.checkInAt) {
      window.alert('No check-in timestamp found. Please check in first.');
      return;
    }

    const row = {
      id: existing?.id || crypto.randomUUID(),
      signup_id: signup.id,
      opportunity_id: String(signup.opportunityId || ''),
      session_id: resolvedSessionId,
      email: signup.email || session()?.email || '',
      volunteer_name: signup.volunteerName || session()?.name || 'Volunteer',
      title: signup.title || '',
      claim_status: action === 'checkout' ? 'submitted' : 'checked_in',
      check_in_at: existing?.checkInAt || now,
      check_in_code: action === 'checkout' ? existing?.checkInCode || null : normalized,
      check_out_at: action === 'checkout' ? now : null,
      check_out_code: action === 'checkout' ? normalized : null,
      claimed_status: action === 'checkout' ? 'attended' : 'checked_in',
      claimed_start: existing?.checkInAt || now,
      claimed_end: action === 'checkout' ? now : null,
      claimed_hours: action === 'checkout' ? hoursBetween(existing?.checkInAt, now) : 0,
      verified_hours: 0,
      submitted_at: action === 'checkout' ? now : null,
      reviewed_by_email: null,
      reviewed_at: null,
      admin_notes: null,
      created_at: existing?.createdAt || now,
      updated_at: now
    };

    setBusy(button, true, action === 'checkout' ? 'Checking out...' : 'Checking in...');
    const { data, error } = await client().from('app_attendance_claims').upsert(row, { onConflict: 'id' }).select('*').single();
    setBusy(button, false);
    if (error) return window.alert(`Could not save attendance: ${error.message}`);

    const saved = claimFromRow(data);
    store().saveAttendanceClaims(upsertLocal(store().getAttendanceClaims(), saved, item => item.id === saved.id));
    await refreshAttendanceClaims().catch(() => null);
    refreshAll();
  }

  document.addEventListener('click', event => {
    if (!ready()) return;
    const attendancePunch = event.target.closest('[data-attendance-punch]');
    if (!attendancePunch) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handleAttendancePunch(attendancePunch);
  }, true);
})();
