-- Phase 26 - Reporting and CSV Exports
-- Admin-only report RPCs for pilot operations.

create or replace function public.report_date_in_range(p_value timestamptz, p_start_date date default null, p_end_date date default null)
returns boolean
language sql
immutable
as $$
  select (p_start_date is null or p_value >= p_start_date::timestamptz)
     and (p_end_date is null or p_value < (p_end_date + 1)::timestamptz);
$$;

create or replace function public.get_admin_volunteer_hours_report(
  p_start_date date default null,
  p_end_date date default null,
  p_opportunity_id text default null,
  p_status text default null
)
returns table (
  volunteer_email text,
  volunteer_name text,
  opportunity_id text,
  session_id uuid,
  title text,
  claim_status text,
  claimed_hours numeric,
  verified_hours numeric,
  check_in_at timestamptz,
  check_out_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by_email text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.email,
         c.volunteer_name,
         c.opportunity_id::text,
         c.session_id,
         c.title,
         c.claim_status::text,
         coalesce(c.claimed_hours, 0),
         coalesce(c.verified_hours, 0),
         c.check_in_at,
         c.check_out_at,
         c.reviewed_at,
         c.reviewed_by_email
  from public.app_attendance_claims c
  where public.current_app_user_is_admin()
    and (p_opportunity_id is null or c.opportunity_id::text = p_opportunity_id)
    and (p_status is null or c.claim_status::text = p_status)
    and public.report_date_in_range(coalesce(c.reviewed_at, c.submitted_at, c.check_out_at, c.check_in_at, c.created_at), p_start_date, p_end_date)
  order by coalesce(c.reviewed_at, c.submitted_at, c.check_out_at, c.check_in_at, c.created_at) desc;
$$;

create or replace function public.get_admin_attendance_verification_report(
  p_start_date date default null,
  p_end_date date default null,
  p_status text default null
)
returns table (
  claim_id uuid,
  signup_id uuid,
  volunteer_email text,
  volunteer_name text,
  opportunity_id text,
  session_id uuid,
  title text,
  claim_status text,
  claimed_status text,
  claimed_hours numeric,
  verified_hours numeric,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  admin_notes text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id,
         c.signup_id,
         c.email,
         c.volunteer_name,
         c.opportunity_id::text,
         c.session_id,
         c.title,
         c.claim_status::text,
         c.claimed_status::text,
         coalesce(c.claimed_hours, 0),
         coalesce(c.verified_hours, 0),
         c.submitted_at,
         c.reviewed_at,
         c.admin_notes
  from public.app_attendance_claims c
  where public.current_app_user_is_admin()
    and (p_status is null or c.claim_status::text = p_status)
    and public.report_date_in_range(coalesce(c.submitted_at, c.reviewed_at, c.check_out_at, c.created_at), p_start_date, p_end_date)
  order by coalesce(c.submitted_at, c.reviewed_at, c.check_out_at, c.created_at) desc;
$$;

create or replace function public.get_admin_participation_report(
  p_start_date date default null,
  p_end_date date default null,
  p_opportunity_id text default null,
  p_status text default null
)
returns table (
  signup_id uuid,
  volunteer_email text,
  volunteer_name text,
  opportunity_id text,
  session_id uuid,
  title text,
  opportunity_type text,
  category text,
  signup_status text,
  signed_up_at timestamptz,
  reviewed_at timestamptz,
  confirmed_at timestamptz,
  waitlisted_at timestamptz,
  completed_at timestamptz,
  verified_hours numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id,
         s.email,
         s.volunteer_name,
         s.opportunity_id::text,
         s.session_id,
         s.title,
         s.type,
         s.category,
         s.status::text,
         s.signed_up_at,
         s.reviewed_at,
         s.confirmed_at,
         s.waitlisted_at,
         s.completed_at,
         coalesce(s.verified_hours, 0)
  from public.app_opportunity_signups s
  where public.current_app_user_is_admin()
    and (p_opportunity_id is null or s.opportunity_id::text = p_opportunity_id)
    and (p_status is null or s.status::text = p_status)
    and public.report_date_in_range(coalesce(s.signed_up_at, s.updated_at), p_start_date, p_end_date)
  order by coalesce(s.signed_up_at, s.updated_at) desc;
$$;

create or replace function public.get_admin_training_completion_report(
  p_start_date date default null,
  p_end_date date default null,
  p_status text default null
)
returns table (
  signup_id uuid,
  training_id text,
  volunteer_email text,
  volunteer_name text,
  title text,
  session_date text,
  session_time text,
  location text,
  trainer text,
  training_status text,
  signed_up_at timestamptz,
  completed_at timestamptz,
  reviewed_at timestamptz,
  admin_notes text
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id,
         t.training_id::text,
         t.email,
         t.volunteer_name,
         t.title,
         t.session_date,
         t.time,
         t.location,
         t.trainer,
         t.status::text,
         t.signed_up_at,
         t.completed_at,
         t.reviewed_at,
         t.admin_notes
  from public.app_training_signups t
  where public.current_app_user_is_admin()
    and (p_status is null or t.status::text = p_status)
    and public.report_date_in_range(coalesce(t.completed_at, t.signed_up_at, t.created_at), p_start_date, p_end_date)
  order by coalesce(t.completed_at, t.signed_up_at, t.created_at) desc;
$$;

create or replace function public.get_admin_referral_report(
  p_start_date date default null,
  p_end_date date default null,
  p_status text default null
)
returns table (
  referral_id uuid,
  referrer_email text,
  referrer_name text,
  referred_email text,
  referred_name text,
  referral_code text,
  referral_status text,
  accepted_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id,
         referrer.email,
         referrer.full_name,
         coalesce(r.referred_email, referred.email),
         referred.full_name,
         r.referral_code,
         r.status::text,
         r.accepted_at,
         r.created_at
  from public.app_referrals r
  left join public.app_users referrer on referrer.id = r.referrer_user_id
  left join public.app_users referred on referred.id = r.referred_user_id
  where public.current_app_user_is_admin()
    and (p_status is null or r.status::text = p_status)
    and public.report_date_in_range(coalesce(r.accepted_at, r.created_at), p_start_date, p_end_date)
  order by coalesce(r.accepted_at, r.created_at) desc;
$$;

create or replace function public.get_admin_points_report(
  p_start_date date default null,
  p_end_date date default null,
  p_reason text default null
)
returns table (
  ledger_id uuid,
  volunteer_email text,
  volunteer_name text,
  points integer,
  points_reason text,
  source_type text,
  source_id uuid,
  awarded_at timestamptz,
  metadata jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id,
         u.email,
         u.full_name,
         l.points,
         l.reason::text,
         l.source_type,
         l.source_id,
         l.created_at,
         l.metadata
  from public.app_points_ledger l
  left join public.app_users u on u.id = l.app_user_id
  where public.current_app_user_is_admin()
    and (p_reason is null or l.reason::text = p_reason)
    and public.report_date_in_range(l.created_at, p_start_date, p_end_date)
  order by l.created_at desc;
$$;

grant execute on function public.get_admin_volunteer_hours_report(date, date, text, text) to authenticated;
grant execute on function public.get_admin_attendance_verification_report(date, date, text) to authenticated;
grant execute on function public.get_admin_participation_report(date, date, text, text) to authenticated;
grant execute on function public.get_admin_training_completion_report(date, date, text) to authenticated;
grant execute on function public.get_admin_referral_report(date, date, text) to authenticated;
grant execute on function public.get_admin_points_report(date, date, text) to authenticated;
