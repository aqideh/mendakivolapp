-- Phase 19: Proper opportunity session model
-- Run after:
-- 1. db/phase-eighteen-audit-logging.sql
-- 2. db/phase-eighteen-completion.sql
--
-- This migration introduces app_opportunity_sessions while keeping the existing
-- opportunity-level UI and RPC call signatures working. Existing one-date
-- opportunities receive a default session. Future work can expose multi-session
-- selection in the UI.

create extension if not exists pgcrypto;

create table if not exists public.app_opportunity_sessions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text not null references public.app_opportunities(id) on delete cascade,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  default_hours numeric(5,2) not null default 0,
  capacity integer not null default 0,
  waitlist_enabled boolean not null default true,
  facilitator_code text,
  location text,
  status text not null default 'Open',
  source text not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_opportunity_sessions_time_order check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint app_opportunity_sessions_facilitator_code_format check (facilitator_code is null or facilitator_code ~ '^\d{4}$')
);

create index if not exists idx_app_opportunity_sessions_opportunity_id
on public.app_opportunity_sessions(opportunity_id);

create index if not exists idx_app_opportunity_sessions_starts_at
on public.app_opportunity_sessions(starts_at);

create index if not exists idx_app_opportunity_sessions_status
on public.app_opportunity_sessions(status);

alter table public.app_opportunity_sessions enable row level security;

drop policy if exists "Anyone can read app opportunity sessions" on public.app_opportunity_sessions;
create policy "Anyone can read app opportunity sessions"
on public.app_opportunity_sessions
for select
using (true);

drop policy if exists "Admins can manage app opportunity sessions" on public.app_opportunity_sessions;
create policy "Admins can manage app opportunity sessions"
on public.app_opportunity_sessions
for all
using (public.current_app_role() in ('admin', 'super_admin'))
with check (public.current_app_role() in ('admin', 'super_admin'));

alter table public.app_opportunity_signups
add column if not exists session_id uuid references public.app_opportunity_sessions(id) on delete set null;

alter table public.app_attendance_claims
add column if not exists session_id uuid references public.app_opportunity_sessions(id) on delete set null;

create index if not exists idx_app_opportunity_signups_session_id
on public.app_opportunity_signups(session_id);

create index if not exists idx_app_attendance_claims_session_id
on public.app_attendance_claims(session_id);

-- Seed one default session per existing opportunity. This keeps existing
-- opportunity-level records usable and gives later features a real session row.
insert into public.app_opportunity_sessions (
  opportunity_id,
  title,
  starts_at,
  ends_at,
  default_hours,
  capacity,
  waitlist_enabled,
  location,
  status,
  source
)
select
  o.id,
  o.title,
  o.starts_at,
  o.ends_at,
  coalesce(o.default_hours, 0),
  coalesce(o.capacity, 0),
  coalesce(o.waitlist_enabled, true),
  nullif(o.location, ''),
  coalesce(nullif(o.status, ''), 'Open'),
  'backfill'
from public.app_opportunities o
where not exists (
  select 1
  from public.app_opportunity_sessions s
  where s.opportunity_id = o.id
);

-- Backfill existing sign-ups and attendance claims to the earliest/default
-- session for their opportunity when possible.
update public.app_opportunity_signups s
set session_id = chosen.id
from lateral (
  select os.id
  from public.app_opportunity_sessions os
  where os.opportunity_id = s.opportunity_id
  order by os.starts_at nulls last, os.created_at asc
  limit 1
) chosen
where s.session_id is null;

update public.app_attendance_claims c
set session_id = chosen.id
from lateral (
  select os.id
  from public.app_opportunity_sessions os
  where os.opportunity_id = c.opportunity_id
  order by os.starts_at nulls last, os.created_at asc
  limit 1
) chosen
where c.session_id is null;

create or replace function public.app_default_opportunity_session_id(p_opportunity_id text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select s.id
  from public.app_opportunity_sessions s
  where s.opportunity_id = p_opportunity_id
    and coalesce(s.status, 'Open') <> 'Closed'
  order by s.starts_at nulls last, s.created_at asc
  limit 1;
$$;

create or replace function public.app_session_confirmed_count(p_session_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.app_opportunity_signups s
  where s.session_id = p_session_id
    and s.status in ('confirmed', 'completed');
$$;

create or replace function public.app_opportunity_confirmed_count(p_opportunity_id text)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.app_opportunity_signups s
  where s.opportunity_id = p_opportunity_id
    and s.status in ('confirmed', 'completed');
$$;

-- New session-aware RPC. Existing frontend calls may continue using the
-- 3-argument wrapper below.
create or replace function public.create_opportunity_session_signup_with_capacity(
  p_signup_id uuid,
  p_opportunity_id text,
  p_session_id uuid default null,
  p_volunteer_name text default 'Volunteer'
)
returns public.app_opportunity_signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_opp public.app_opportunities%rowtype;
  v_session public.app_opportunity_sessions%rowtype;
  v_existing public.app_opportunity_signups%rowtype;
  v_had_existing boolean := false;
  v_status signup_status := 'pending_review'::signup_status;
  v_confirmed_count integer := 0;
  v_now timestamptz := now();
  v_saved public.app_opportunity_signups%rowtype;
begin
  v_email := auth.email();
  v_user_id := public.current_app_user_id();

  if v_email is null then
    raise exception 'Sign in required';
  end if;

  select * into v_opp
  from public.app_opportunities
  where id = p_opportunity_id
  for share;

  if not found then
    raise exception 'Opportunity not found: %', p_opportunity_id;
  end if;

  select * into v_session
  from public.app_opportunity_sessions
  where id = coalesce(p_session_id, public.app_default_opportunity_session_id(p_opportunity_id))
    and opportunity_id = p_opportunity_id
  for share;

  if not found then
    raise exception 'Opportunity session not found for opportunity: %', p_opportunity_id;
  end if;

  select * into v_existing
  from public.app_opportunity_signups
  where opportunity_id = p_opportunity_id
    and email = v_email
    and coalesce(session_id, v_session.id) = v_session.id
  for update;

  v_had_existing := found;

  if v_had_existing and v_existing.status not in ('cancelled', 'declined') then
    return v_existing;
  end if;

  v_confirmed_count := public.app_session_confirmed_count(v_session.id);
  if v_session.capacity > 0 and v_confirmed_count >= v_session.capacity then
    v_status := case when v_session.waitlist_enabled then 'waitlisted'::signup_status else 'declined'::signup_status end;
  end if;

  insert into public.app_opportunity_signups (
    id,
    opportunity_id,
    session_id,
    volunteer_user_id,
    email,
    volunteer_name,
    title,
    type,
    category,
    time,
    location,
    commitment,
    hours,
    status,
    signed_up_at,
    waitlisted_at,
    declined_at,
    updated_at
  ) values (
    coalesce(p_signup_id, gen_random_uuid()),
    p_opportunity_id,
    v_session.id,
    v_user_id,
    v_email,
    coalesce(nullif(p_volunteer_name, ''), 'Volunteer'),
    v_opp.title,
    v_opp.type,
    v_opp.category,
    coalesce(nullif(v_opp.time, ''), ''),
    coalesce(nullif(v_session.location, ''), nullif(v_opp.location, ''), ''),
    v_opp.commitment,
    coalesce(v_session.default_hours, v_opp.default_hours, 0),
    v_status,
    v_now,
    case when v_status = 'waitlisted' then v_now else null end,
    case when v_status = 'declined' then v_now else null end,
    v_now
  )
  on conflict (opportunity_id, email) do update
  set session_id = excluded.session_id,
      volunteer_user_id = excluded.volunteer_user_id,
      volunteer_name = excluded.volunteer_name,
      title = excluded.title,
      type = excluded.type,
      category = excluded.category,
      time = excluded.time,
      location = excluded.location,
      commitment = excluded.commitment,
      hours = excluded.hours,
      status = excluded.status,
      signed_up_at = v_now,
      waitlisted_at = excluded.waitlisted_at,
      declined_at = excluded.declined_at,
      cancelled_at = null,
      updated_at = v_now
  returning * into v_saved;

  perform public.log_app_audit_event(
    case when v_had_existing then 'opportunity_session_signup_reactivated' else 'opportunity_session_signup_created' end,
    'app_opportunity_signups',
    v_saved.id::text,
    v_saved.email,
    case when v_had_existing then to_jsonb(v_existing) else null end,
    to_jsonb(v_saved),
    jsonb_build_object(
      'opportunity_id', v_saved.opportunity_id,
      'session_id', v_session.id,
      'opportunity_title', v_saved.title,
      'status', v_saved.status,
      'session_capacity', v_session.capacity,
      'session_waitlist_enabled', v_session.waitlist_enabled,
      'confirmed_count_before', v_confirmed_count
    )
  );

  return v_saved;
end;
$$;

revoke all on function public.create_opportunity_session_signup_with_capacity(uuid, text, uuid, text) from public;
grant execute on function public.create_opportunity_session_signup_with_capacity(uuid, text, uuid, text) to authenticated;

-- Backward-compatible wrapper used by the existing app.
create or replace function public.create_opportunity_signup_with_capacity(
  p_signup_id uuid,
  p_opportunity_id text,
  p_volunteer_name text default 'Volunteer'
)
returns public.app_opportunity_signups
language sql
security definer
set search_path = public
as $$
  select public.create_opportunity_session_signup_with_capacity(
    p_signup_id,
    p_opportunity_id,
    public.app_default_opportunity_session_id(p_opportunity_id),
    p_volunteer_name
  );
$$;

revoke all on function public.create_opportunity_signup_with_capacity(uuid, text, text) from public;
grant execute on function public.create_opportunity_signup_with_capacity(uuid, text, text) to authenticated;

-- Recreate review RPC so capacity checks happen at session level when a session
-- exists, falling back to opportunity-level logic for legacy rows.
create or replace function public.review_opportunity_signup_with_capacity(
  p_signup_id uuid,
  p_status signup_status,
  p_admin_notes text default null
)
returns public.app_opportunity_signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_previous public.app_opportunity_signups%rowtype;
  v_signup public.app_opportunity_signups%rowtype;
  v_opp public.app_opportunities%rowtype;
  v_session public.app_opportunity_sessions%rowtype;
  v_confirmed_count integer := 0;
  v_capacity integer := 0;
  v_waitlist_enabled boolean := true;
  v_now timestamptz := now();
  v_final_status signup_status := p_status;
begin
  v_role := public.current_app_role();
  if v_role not in ('admin', 'super_admin') then
    raise exception 'Only admins can review opportunity sign-ups';
  end if;

  if p_status not in ('confirmed', 'waitlisted', 'declined', 'pending_review') then
    raise exception 'Invalid review status: %', p_status;
  end if;

  select * into v_signup
  from public.app_opportunity_signups
  where id = p_signup_id
  for update;

  if not found then
    raise exception 'Sign-up not found: %', p_signup_id;
  end if;

  v_previous := v_signup;

  select * into v_opp
  from public.app_opportunities
  where id = v_signup.opportunity_id
  for share;

  if v_signup.session_id is not null then
    select * into v_session
    from public.app_opportunity_sessions
    where id = v_signup.session_id
    for share;
  end if;

  if p_status = 'confirmed' then
    if v_signup.session_id is not null then
      v_capacity := coalesce(v_session.capacity, 0);
      v_waitlist_enabled := coalesce(v_session.waitlist_enabled, true);
      select count(*)::integer into v_confirmed_count
      from public.app_opportunity_signups
      where session_id = v_signup.session_id
        and status in ('confirmed', 'completed')
        and id <> v_signup.id;
    elsif found then
      v_capacity := coalesce(v_opp.capacity, 0);
      v_waitlist_enabled := coalesce(v_opp.waitlist_enabled, true);
      select count(*)::integer into v_confirmed_count
      from public.app_opportunity_signups
      where opportunity_id = v_signup.opportunity_id
        and status in ('confirmed', 'completed')
        and id <> v_signup.id;
    end if;

    if v_capacity > 0 and v_confirmed_count >= v_capacity then
      v_final_status := case when v_waitlist_enabled then 'waitlisted'::signup_status else 'declined'::signup_status end;
    end if;
  end if;

  update public.app_opportunity_signups
  set status = v_final_status,
      reviewed_at = v_now,
      reviewed_by_email = auth.email(),
      admin_notes = nullif(p_admin_notes, ''),
      confirmed_at = case when v_final_status = 'confirmed' then coalesce(confirmed_at, v_now) else confirmed_at end,
      waitlisted_at = case when v_final_status = 'waitlisted' then coalesce(waitlisted_at, v_now) else waitlisted_at end,
      declined_at = case when v_final_status = 'declined' then coalesce(declined_at, v_now) else declined_at end,
      updated_at = v_now
  where id = p_signup_id
  returning * into v_signup;

  perform public.log_app_audit_event(
    'opportunity_signup_reviewed',
    'app_opportunity_signups',
    v_signup.id::text,
    v_signup.email,
    to_jsonb(v_previous),
    to_jsonb(v_signup),
    jsonb_build_object(
      'requested_status', p_status,
      'final_status', v_final_status,
      'opportunity_id', v_signup.opportunity_id,
      'session_id', v_signup.session_id,
      'opportunity_title', v_signup.title,
      'capacity', v_capacity,
      'waitlist_enabled', v_waitlist_enabled,
      'confirmed_count_before_review', v_confirmed_count,
      'capacity_adjusted', p_status <> v_final_status
    )
  );

  return v_signup;
end;
$$;

revoke all on function public.review_opportunity_signup_with_capacity(uuid, signup_status, text) from public;
grant execute on function public.review_opportunity_signup_with_capacity(uuid, signup_status, text) to authenticated;
