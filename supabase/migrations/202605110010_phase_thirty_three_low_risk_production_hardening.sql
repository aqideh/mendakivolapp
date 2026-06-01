-- Phase 33 - low-risk production hardening
-- Applies advisor-driven fixes that are unlikely to break pilot flows.

-- 1. Add explicit search_path to helper functions flagged by security advisor.
create or replace function public.report_date_in_range(
  p_value timestamptz,
  p_start_date date default null,
  p_end_date date default null
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select (p_start_date is null or p_value >= p_start_date::timestamptz)
     and (p_end_date is null or p_value < (p_end_date + 1)::timestamptz);
$$;

create or replace function public.notification_category_for_type(p_type text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(p_type, '') like 'opportunity_%' then 'opportunities'
    when coalesce(p_type, '') like 'attendance_%' then 'attendance'
    when coalesce(p_type, '') like 'training_%' then 'training'
    when coalesce(p_type, '') like 'referral_%' then 'referrals'
    when coalesce(p_type, '') like 'points_%' or coalesce(p_type, '') like 'achievement_%' then 'points'
    when coalesce(p_type, '') like 'admin_%' then 'admin'
    else 'general'
  end;
$$;

create or replace function public.make_referral_code(p_seed text)
returns text
language plpgsql
set search_path = public
as $$
declare
  base text;
  candidate text;
  attempts integer := 0;
begin
  base := upper(regexp_replace(coalesce(p_seed, 'VOL'), '[^A-Za-z0-9]+', '', 'g'));
  if length(base) < 3 then
    base := 'VOL';
  end if;
  base := left(base, 8);

  loop
    candidate := base || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.app_referral_codes where code = candidate);
    attempts := attempts + 1;
    if attempts > 10 then
      candidate := 'VOL-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
      exit;
    end if;
  end loop;

  return candidate;
end;
$$;

-- 2. Remove anonymous direct execution of role helper RPCs. These functions remain usable
-- inside RLS policies and SECURITY DEFINER functions.
revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.current_app_user_id() from public, anon;
revoke execute on function public.current_app_user_is_admin() from public, anon;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.current_app_user_is_admin() to authenticated;

-- 3. Add indexes for live app-table foreign keys flagged by performance advisor.
create index if not exists idx_app_audit_logs_target_user_id on public.app_audit_logs(target_user_id);
create index if not exists idx_app_opportunity_signups_volunteer_user_id on public.app_opportunity_signups(volunteer_user_id);
create index if not exists idx_app_points_ledger_awarded_by on public.app_points_ledger(awarded_by);
create index if not exists idx_app_training_signups_volunteer_user_id on public.app_training_signups(volunteer_user_id);
create index if not exists idx_app_user_achievements_achievement_id on public.app_user_achievements(achievement_id);

-- 4. Drop only clear duplicate audit indexes, keeping the app_* canonical names.
drop index if exists public.idx_app_audit_logs_actor;
drop index if exists public.idx_app_audit_logs_created_at;
