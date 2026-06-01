-- Phase 41 - Supabase validation checks
-- Purpose: non-destructive validation after Phases 34-40.
-- Run in Supabase SQL editor or via the Supabase execute_sql tool.
-- Expected output: every row should return status = 'pass'.

with checks as (
  select
    'phase40_referral_rpc_exists' as check_name,
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'review_app_referral_status'
    ) as passed,
    'review_app_referral_status RPC should exist' as detail

  union all

  select
    'phase40_referral_rpc_not_anon_executable',
    not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'review_app_referral_status'
        and has_function_privilege('anon', p.oid, 'EXECUTE')
    ),
    'anonymous role should not be able to execute referral review RPC'

  union all

  select
    'phase40_referral_rpc_authenticated_executable',
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'review_app_referral_status'
        and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    ),
    'authenticated role should be able to call RPC; RPC enforces admin internally'

  union all

  select
    'audit_function_exists',
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'record_app_audit_log'
    ),
    'record_app_audit_log should exist for referral status audit entries'

  union all

  select
    'app_referrals_table_exists',
    to_regclass('public.app_referrals') is not null,
    'app_referrals table should exist'

  union all

  select
    'app_referrals_rls_enabled',
    coalesce((
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'app_referrals'
    ), false),
    'RLS should be enabled on app_referrals'

  union all

  select
    'app_referral_codes_rls_enabled',
    coalesce((
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'app_referral_codes'
    ), false),
    'RLS should be enabled on app_referral_codes'

  union all

  select
    'app_referrals_status_constraint_present',
    exists (
      select 1
      from pg_constraint
      where conname = 'app_referrals_status_check'
    ),
    'app_referrals should restrict statuses to accepted/converted/cancelled/duplicate'

  union all

  select
    'attendance_session_validation_rpc_exists',
    exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'validate_session_attendance_code'
    ),
    'session-aware attendance validation RPC should exist'

  union all

  select
    'training_session_table_exists',
    to_regclass('public.app_training_sessions') is not null,
    'Phase 30 training session table should exist'

  union all

  select
    'points_ledger_table_exists',
    to_regclass('public.app_points_ledger') is not null,
    'points ledger should exist'

  union all

  select
    'no_public_points_adjustment_rpc_detected',
    not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('adjust_user_points', 'admin_adjust_points', 'create_points_adjustment')
    ),
    'points adjustment should remain policy-gated/read-only unless explicitly approved'
)
select
  check_name,
  case when passed then 'pass' else 'fail' end as status,
  detail
from checks
order by check_name;
