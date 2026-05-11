-- Phase 33 production-readiness verification checks
-- Read-only consolidated result set.

with checks as (
  select 'phase29_5_anon_rpc_grants' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from public.get_phase_29_5_rpc_grant_audit()
  where anon_can_execute = true

  union all

  select 'role_helpers_anon_executable' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('current_app_role', 'current_app_user_id', 'current_app_user_is_admin')
    and has_function_privilege('anon', p.oid, 'EXECUTE')

  union all

  select 'mutable_search_path_helpers' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('report_date_in_range', 'make_referral_code', 'notification_category_for_type')
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig, array[]::text[])) cfg
      where cfg like 'search_path=%'
    )

  union all

  select 'phase33_live_fk_indexes_missing' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from (
    values
      ('app_audit_logs', 'idx_app_audit_logs_target_user_id'),
      ('app_opportunity_signups', 'idx_app_opportunity_signups_volunteer_user_id'),
      ('app_points_ledger', 'idx_app_points_ledger_awarded_by'),
      ('app_training_signups', 'idx_app_training_signups_volunteer_user_id'),
      ('app_user_achievements', 'idx_app_user_achievements_achievement_id')
  ) as required(table_name, index_name)
  where not exists (
    select 1
    from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename = required.table_name
      and i.indexname = required.index_name
  )

  union all

  select 'duplicate_audit_indexes_remaining' as check_name,
         count(*)::text as result,
         count(*)::integer as failing_count
  from pg_indexes i
  where i.schemaname = 'public'
    and i.tablename = 'app_audit_logs'
    and i.indexname in ('idx_app_audit_logs_actor', 'idx_app_audit_logs_created_at')

  union all

  select 'phase32_reference_integrity' as check_name,
         (
           coalesce((select count(*) from public.app_training_signups s where s.training_session_id is not null and not exists (select 1 from public.app_training_sessions ts where ts.id = s.training_session_id)), 0)
           + coalesce((select count(*) from public.app_training_sessions child where child.parent_training_id is not null and not exists (select 1 from public.app_training_sessions parent where parent.id = child.parent_training_id)), 0)
           + coalesce((select count(*) from public.app_opportunity_signups s where s.session_id is not null and not exists (select 1 from public.app_opportunity_sessions os where os.id = s.session_id)), 0)
           + coalesce((select count(*) from public.app_attendance_claims c where c.session_id is not null and not exists (select 1 from public.app_opportunity_sessions os where os.id = c.session_id)), 0)
         )::text as result,
         (
           coalesce((select count(*) from public.app_training_signups s where s.training_session_id is not null and not exists (select 1 from public.app_training_sessions ts where ts.id = s.training_session_id)), 0)
           + coalesce((select count(*) from public.app_training_sessions child where child.parent_training_id is not null and not exists (select 1 from public.app_training_sessions parent where parent.id = child.parent_training_id)), 0)
           + coalesce((select count(*) from public.app_opportunity_signups s where s.session_id is not null and not exists (select 1 from public.app_opportunity_sessions os where os.id = s.session_id)), 0)
           + coalesce((select count(*) from public.app_attendance_claims c where c.session_id is not null and not exists (select 1 from public.app_opportunity_sessions os where os.id = c.session_id)), 0)
         )::integer as failing_count

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
