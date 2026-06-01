-- Phase 29.5 - Security and Session Contract Hardening
-- Tighten RPC execute grants for pilot/beta use while preserving authenticated app flows.

-- Sensitive RPCs should not be callable by anonymous users. Authenticated users may still
-- need execute permission because Supabase exposes all signed-in users through the
-- authenticated database role; admin-only enforcement remains inside the functions.
do $$
declare
  r record;
  v_sensitive text[] := array[
    'accept_referral_code',
    'ensure_my_referral_code',
    'get_my_referrals',
    'get_my_points_summary',
    'get_my_notification_history',
    'get_my_notification_preferences',
    'mark_my_notifications_read',
    'clear_my_notifications',
    'set_my_notification_preference',
    'create_opportunity_signup_with_capacity',
    'create_opportunity_session_signup_with_capacity',
    'cancel_opportunity_signup',
    'create_training_signup_with_capacity',
    'cancel_training_signup',
    'validate_attendance_code',
    'validate_session_attendance_code',
    'upsert_attendance_code',
    'review_opportunity_signup_with_capacity',
    'review_training_signup_lifecycle',
    'review_attendance_claim_transactional',
    'get_admin_session_code_warnings',
    'get_admin_attendance_verification_report',
    'get_admin_participation_report',
    'get_admin_training_completion_report',
    'get_admin_volunteer_hours_report',
    'get_admin_referral_report',
    'get_admin_referrals',
    'get_admin_points_report',
    'get_admin_points_summary',
    'get_admin_audit_logs',
    'get_admin_audit_filter_options',
    'award_available_points',
    'award_points_once',
    'award_referral_points',
    'award_training_completion_points',
    'award_verified_attendance_points',
    'refresh_user_achievements',
    'user_total_points',
    'promote_next_opportunity_waitlist',
    'promote_next_training_waitlist',
    'create_app_notification',
    'record_app_audit_log',
    'log_app_audit_event',
    'log_content_edit',
    'log_notification_audit',
    'upsert_attendance_code'
  ];
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(v_sensitive)
  loop
    execute format('revoke execute on function %s from public', r.fn);
    execute format('revoke execute on function %s from anon', r.fn);
    execute format('grant execute on function %s to authenticated', r.fn);
  end loop;
end $$;

-- Explicitly keep low-risk read/count helpers available only to signed-in users where
-- client code needs them, while avoiding anonymous execution. Helper role functions are
-- left unchanged to avoid breaking existing RLS policy evaluation on public read tables.
do $$
declare
  r record;
  v_auth_helpers text[] := array[
    'app_default_opportunity_session_id',
    'app_opportunity_confirmed_count',
    'app_session_confirmed_count',
    'app_training_registered_count',
    'notification_in_app_enabled',
    'notification_category_for_type',
    'make_referral_code',
    'resolve_app_user_id'
  ];
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(v_auth_helpers)
  loop
    execute format('revoke execute on function %s from public', r.fn);
    execute format('revoke execute on function %s from anon', r.fn);
    execute format('grant execute on function %s to authenticated', r.fn);
  end loop;
end $$;

-- Harden session attendance validation so session context is preferred and fallback is explicit.
create or replace function public.validate_session_attendance_code(
  p_opportunity_id text,
  p_session_id uuid default null,
  p_code text default null,
  p_allow_opportunity_fallback boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := trim(coalesce(p_code, ''));
  v_session record;
  v_opportunity_valid boolean := false;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  if v_code !~ '^\d{4}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_format');
  end if;

  if p_session_id is not null then
    select id, opportunity_id, facilitator_code
      into v_session
    from public.app_opportunity_sessions
    where id = p_session_id
    limit 1;

    if v_session.id is null then
      return jsonb_build_object('ok', false, 'reason', 'missing_session');
    end if;

    if p_opportunity_id is not null and trim(p_opportunity_id) <> '' and v_session.opportunity_id::text <> p_opportunity_id::text then
      return jsonb_build_object('ok', false, 'reason', 'session_opportunity_mismatch');
    end if;

    if nullif(trim(coalesce(v_session.facilitator_code, '')), '') is not null then
      if trim(v_session.facilitator_code) = v_code then
        return jsonb_build_object('ok', true, 'scope', 'session', 'session_id', v_session.id);
      end if;
      return jsonb_build_object('ok', false, 'reason', 'invalid_session_code', 'scope', 'session', 'session_id', v_session.id);
    end if;

    if not p_allow_opportunity_fallback then
      return jsonb_build_object('ok', false, 'reason', 'session_code_missing', 'scope', 'session', 'session_id', v_session.id);
    end if;
  end if;

  if p_allow_opportunity_fallback and p_opportunity_id is not null and trim(p_opportunity_id) <> '' then
    begin
      select public.validate_attendance_code(p_opportunity_id::text, v_code) into v_opportunity_valid;
    exception when undefined_function then
      v_opportunity_valid := false;
    end;

    if v_opportunity_valid then
      return jsonb_build_object('ok', true, 'scope', 'opportunity_fallback');
    end if;
  end if;

  if p_session_id is not null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code_with_fallback_checked', 'scope', 'session');
  end if;

  return jsonb_build_object('ok', false, 'reason', 'invalid_opportunity_code', 'scope', 'opportunity');
end;
$$;

revoke execute on function public.validate_session_attendance_code(text, uuid, text, boolean) from public, anon;
grant execute on function public.validate_session_attendance_code(text, uuid, text, boolean) to authenticated;

-- Verification helper for future sessions. It reports remaining anonymous execute grants
-- on the RPCs Phase 29.5 intended to harden.
create or replace function public.get_phase_29_5_rpc_grant_audit()
returns table(function_name text, function_signature text, anon_can_execute boolean, authenticated_can_execute boolean)
language sql
stable
security definer
set search_path = public
as $$
  with target_names(name) as (
    values
      ('accept_referral_code'),
      ('ensure_my_referral_code'),
      ('get_my_referrals'),
      ('get_my_points_summary'),
      ('get_my_notification_history'),
      ('get_my_notification_preferences'),
      ('mark_my_notifications_read'),
      ('clear_my_notifications'),
      ('set_my_notification_preference'),
      ('create_opportunity_signup_with_capacity'),
      ('create_opportunity_session_signup_with_capacity'),
      ('cancel_opportunity_signup'),
      ('create_training_signup_with_capacity'),
      ('cancel_training_signup'),
      ('validate_attendance_code'),
      ('validate_session_attendance_code'),
      ('upsert_attendance_code'),
      ('review_opportunity_signup_with_capacity'),
      ('review_training_signup_lifecycle'),
      ('review_attendance_claim_transactional'),
      ('get_admin_session_code_warnings'),
      ('get_admin_attendance_verification_report'),
      ('get_admin_participation_report'),
      ('get_admin_training_completion_report'),
      ('get_admin_volunteer_hours_report'),
      ('get_admin_referral_report'),
      ('get_admin_referrals'),
      ('get_admin_points_report'),
      ('get_admin_points_summary'),
      ('get_admin_audit_logs'),
      ('get_admin_audit_filter_options'),
      ('award_available_points'),
      ('award_points_once'),
      ('award_referral_points'),
      ('award_training_completion_points'),
      ('award_verified_attendance_points'),
      ('refresh_user_achievements'),
      ('user_total_points'),
      ('promote_next_opportunity_waitlist'),
      ('promote_next_training_waitlist'),
      ('create_app_notification'),
      ('record_app_audit_log'),
      ('log_app_audit_event'),
      ('log_content_edit'),
      ('log_notification_audit')
  )
  select p.proname::text,
         p.oid::regprocedure::text,
         has_function_privilege('anon', p.oid, 'EXECUTE'),
         has_function_privilege('authenticated', p.oid, 'EXECUTE')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join target_names t on t.name = p.proname
  where n.nspname = 'public'
  order by p.proname, p.oid::regprocedure::text;
$$;

revoke execute on function public.get_phase_29_5_rpc_grant_audit() from public, anon;
grant execute on function public.get_phase_29_5_rpc_grant_audit() to authenticated;
