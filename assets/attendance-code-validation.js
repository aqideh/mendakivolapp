(() => {
  function client() {
    return window.VolunteerDataStore?.authState?.supabase || null;
  }

  function hasSession() {
    return Boolean(window.VolunteerDataStore?.getSession?.()?.email);
  }

  function currentEmail() {
    return window.VolunteerDataStore?.currentEmail?.() || window.VolunteerDataStore?.getSession?.()?.email || '';
  }

  function findSignupForOpportunity(opportunityId, explicitSessionId = '') {
    const signups = window.VolunteerDataStore?.getOpportunitySignups?.() || [];
    const email = currentEmail();
    const candidates = signups.filter(item =>
      String(item.opportunityId || '') === String(opportunityId || '') &&
      (!email || String(item.email || '').toLowerCase() === String(email).toLowerCase()) &&
      ['confirmed', 'checked_in', 'completed', 'submitted', 'verified', 'adjusted'].includes(String(item.status || '').toLowerCase())
    );
    if (explicitSessionId) return candidates.find(item => String(item.sessionId || '') === String(explicitSessionId)) || null;
    return candidates.find(item => item.sessionId) || candidates[0] || null;
  }

  function normalizeValidationResult(data) {
    if (data === true) return { ok: true };
    if (data?.ok === true) return { ok: true, scope: data.scope || '', sessionId: data.session_id || '' };
    const reasonMap = {
      invalid_format: 'Please enter a valid 4-digit code.',
      missing_session: 'This attendance session could not be found. Please refresh and try again.',
      session_opportunity_mismatch: 'This attendance code does not match the selected opportunity session.',
      invalid_session_code: 'Invalid session facilitator code. Please check with the facilitator and try again.',
      session_code_missing: 'This session has no facilitator code. Please ask an admin to set one before check-in.',
      invalid_code_with_fallback_checked: 'Invalid facilitator code for this session.',
      invalid_opportunity_code: 'Invalid facilitator code. Please check with the facilitator and try again.'
    };
    return { ok: false, reason: reasonMap[data?.reason] || 'Invalid facilitator code. Please check with the facilitator and try again.' };
  }

  async function validateAttendanceCode(opportunityId, code, options = {}) {
    const normalizedCode = String(code || '').trim();
    if (!/^\d{4}$/.test(normalizedCode)) {
      return { ok: false, reason: 'Please enter a valid 4-digit code.' };
    }

    const supabase = client();
    if (!supabase || !hasSession()) {
      return { ok: true, fallback: true };
    }

    const signup = options.signup || findSignupForOpportunity(opportunityId, options.sessionId || '');
    const sessionId = options.sessionId || signup?.sessionId || '';

    const { data, error } = await supabase.rpc('validate_session_attendance_code', {
      p_opportunity_id: String(opportunityId || ''),
      p_session_id: sessionId || null,
      p_code: normalizedCode,
      p_allow_opportunity_fallback: options.allowOpportunityFallback !== false
    });

    if (!error) return normalizeValidationResult(data);

    const missingRpc = String(error.message || '').includes('validate_session_attendance_code') || String(error.message || '').includes('function') || String(error.code || '') === '42883';
    if (!missingRpc) {
      console.warn('Could not validate session attendance code through Supabase.', error);
      return {
        ok: false,
        reason: 'Attendance code validation is not available. Please ask an admin to verify the Phase 29 migration.'
      };
    }

    const legacy = await supabase.rpc('validate_attendance_code', {
      p_opportunity_id: String(opportunityId || ''),
      p_code: normalizedCode
    });

    if (legacy.error) {
      console.warn('Could not validate attendance code through Supabase.', legacy.error);
      return {
        ok: false,
        reason: 'Attendance code validation is not available. Please ask an admin to run the attendance-code migration.'
      };
    }

    if (legacy.data === true) return { ok: true, scope: 'legacy_opportunity' };
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

  async function fetchAttendanceCodes() {
    const supabase = client();
    if (!supabase || !hasSession() || !window.VolunteerDataStore?.isAdmin?.()) return {};

    const { data, error } = await supabase
      .from('app_attendance_codes')
      .select('opportunity_id, code, label, active, updated_at')
      .eq('active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Could not fetch attendance codes.', error);
      return {};
    }

    return (data || []).reduce((map, row) => {
      if (!map[row.opportunity_id]) {
        map[row.opportunity_id] = {
          code: row.code || '',
          label: row.label || 'Facilitator code',
          updatedAt: row.updated_at || ''
        };
      }
      return map;
    }, {});
  }

  async function fetchSessionCodeWarnings() {
    const supabase = client();
    if (!supabase || !hasSession() || !window.VolunteerDataStore?.isAdmin?.()) return [];
    const { data, error } = await supabase.rpc('get_admin_session_code_warnings');
    if (error) {
      console.warn('Could not fetch session code warnings.', error);
      return [];
    }
    return Array.isArray(data) ? data : [];
  }

  Object.assign(window.VolunteerDataStore || {}, {
    validateAttendanceCode,
    upsertAttendanceCode,
    fetchAttendanceCodes,
    fetchSessionCodeWarnings
  });
})();
