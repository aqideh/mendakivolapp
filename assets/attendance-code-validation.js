(() => {
  function client() {
    return window.VolunteerDataStore?.authState?.supabase || null;
  }

  function hasSession() {
    return Boolean(window.VolunteerDataStore?.getSession?.()?.email);
  }

  async function validateAttendanceCode(opportunityId, code) {
    const normalizedCode = String(code || '').trim();
    if (!/^\d{4}$/.test(normalizedCode)) {
      return { ok: false, reason: 'Please enter a valid 4-digit code.' };
    }

    const supabase = client();
    if (!supabase || !hasSession()) {
      return { ok: true, fallback: true };
    }

    const { data, error } = await supabase.rpc('validate_attendance_code', {
      p_opportunity_id: String(opportunityId || ''),
      p_code: normalizedCode
    });

    if (error) {
      console.warn('Could not validate attendance code through Supabase.', error);
      return {
        ok: false,
        reason: 'Attendance code validation is not available. Please ask an admin to run the Phase 13 migration.'
      };
    }

    if (data === true) return { ok: true };
    return { ok: false, reason: 'Invalid facilitator code. Please check with the facilitator and try again.' };
  }

  async function upsertAttendanceCode(opportunityId, code, label = 'Facilitator code') {
    const normalizedCode = String(code || '').trim();
    if (!normalizedCode) return { ok: true, skipped: true };
    if (!/^\d{4}$/.test(normalizedCode)) {
      return { ok: false, reason: 'Attendance code must be 4 digits.' };
    }

    const supabase = client();
    if (!supabase || !hasSession() || !window.VolunteerDataStore?.isAdmin?.()) {
      return { ok: false, skipped: true };
    }

    const { data, error } = await supabase.rpc('upsert_attendance_code', {
      p_opportunity_id: String(opportunityId || ''),
      p_code: normalizedCode,
      p_label: label || 'Facilitator code'
    });

    if (error) {
      console.warn('Could not save attendance code.', error);
      return { ok: false, reason: error.message };
    }

    return { ok: true, id: data };
  }

  Object.assign(window.VolunteerDataStore || {}, {
    validateAttendanceCode,
    upsertAttendanceCode
  });
})();
