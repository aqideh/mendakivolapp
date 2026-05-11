-- Phase 32 smoke verification checks
-- Run read-only before demos, merge reviews, or production-readiness work.
-- This file intentionally returns one result set so Supabase SQL runners show every check.

with checks as (
  select 'phase29_5_anon_rpc_grants' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from public.get_phase_29_5_rpc_grant_audit()
  where anon_can_execute = true

  union all

  select 'required_tables_missing' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from (
    values
      ('app_users'),
      ('app_opportunities'),
      ('app_opportunity_sessions'),
      ('app_opportunity_signups'),
      ('app_attendance_claims'),
      ('app_training_sessions'),
      ('app_training_signups'),
      ('app_referrals'),
      ('app_points_ledger'),
      ('app_achievements'),
      ('app_user_achievements'),
      ('app_notifications'),
      ('app_audit_logs'),
      ('app_news_items')
  ) as required(table_name)
  where not exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_name = required.table_name
  )

  union all

  select 'phase30_training_columns_missing' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from (
    values
      ('app_training_sessions', 'parent_training_id'),
      ('app_training_sessions', 'session_title'),
      ('app_training_sessions', 'starts_at'),
      ('app_training_sessions', 'ends_at'),
      ('app_training_sessions', 'default_hours'),
      ('app_training_sessions', 'is_session_instance'),
      ('app_training_signups', 'training_session_id'),
      ('app_training_signups', 'session_title'),
      ('app_training_signups', 'completed_session_at')
  ) as required(table_name, column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = required.table_name
      and c.column_name = required.column_name
  )

  union all

  select 'phase30_functions_missing' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from (
    values
      ('app_default_training_session_id'),
      ('app_training_session_registered_count'),
      ('create_training_session_signup_with_capacity')
  ) as required(function_name)
  where not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = required.function_name
  )

  union all

  select 'phase30_training_session_unique_index_missing' as check_name,
         case when exists (
           select 1
           from pg_indexes
           where schemaname = 'public'
             and tablename = 'app_training_signups'
             and indexname = 'app_training_signups_unique_session_registration_idx'
         ) then '0' else '1' end as result,
         case when exists (
           select 1
           from pg_indexes
           where schemaname = 'public'
             and tablename = 'app_training_signups'
             and indexname = 'app_training_signups_unique_session_registration_idx'
         ) then 0 else 1 end as failing_count

  union all

  select 'invalid_training_signup_session_refs' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from public.app_training_signups s
  where s.training_session_id is not null
    and not exists (
      select 1
      from public.app_training_sessions ts
      where ts.id = s.training_session_id
    )

  union all

  select 'invalid_training_parent_refs' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from public.app_training_sessions child
  where child.parent_training_id is not null
    and not exists (
      select 1
      from public.app_training_sessions parent
      where parent.id = child.parent_training_id
    )

  union all

  select 'invalid_opportunity_signup_session_refs' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from public.app_opportunity_signups s
  where s.session_id is not null
    and not exists (
      select 1
      from public.app_opportunity_sessions os
      where os.id = s.session_id
    )

  union all

  select 'invalid_attendance_claim_session_refs' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from public.app_attendance_claims c
  where c.session_id is not null
    and not exists (
      select 1
      from public.app_opportunity_sessions os
      where os.id = c.session_id
    )

  union all

  select 'context_counts' as check_name,
         jsonb_build_object(
           'opportunities', (select count(*) from public.app_opportunities),
           'opportunity_sessions', (select count(*) from public.app_opportunity_sessions),
           'opportunity_signups', (select count(*) from public.app_opportunity_signups),
           'attendance_claims', (select count(*) from public.app_attendance_claims),
           'training_rows', (select count(*) from public.app_training_sessions),
           'training_signups', (select count(*) from public.app_training_signups),
           'referrals', (select count(*) from public.app_referrals),
           'points_ledger', (select count(*) from public.app_points_ledger),
           'notifications', (select count(*) from public.app_notifications),
           'audit_logs', (select count(*) from public.app_audit_logs)
         )::text as result,
         0 as failing_count
)
select check_name,
       case when failing_count = 0 then 'pass' else 'fail' end as status,
       result,
       failing_count
from checks
order by case when check_name = 'context_counts' then 2 else 1 end, check_name;
