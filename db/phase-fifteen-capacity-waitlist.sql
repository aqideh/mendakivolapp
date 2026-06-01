-- Phase 15: Capacity and waitlist enforcement
-- Run this after:
-- 1. db/phase-one-schema.sql
-- 2. db/phase-eight-supabase-signups.sql
-- 3. db/phase-nine-supabase-attendance.sql
-- 4. db/phase-ten-supabase-training.sql
-- 5. db/phase-eleven-supabase-content.sql
-- 6. db/phase-twelve-supabase-notifications.sql
-- 7. db/phase-thirteen-attendance-code-validation.sql
-- 8. db/phase-fourteen-transactional-attendance.sql

alter table public.app_opportunities
add column if not exists capacity integer not null default 0;

alter table public.app_opportunities
add column if not exists waitlist_enabled boolean not null default true;

create index if not exists idx_app_opportunity_signups_capacity_counts
on public.app_opportunity_signups(opportunity_id, status);

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

create or replace function public.create_opportunity_signup_with_capacity(
  p_signup_id uuid,
  p_opportunity_id text,
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
  v_existing public.app_opportunity_signups%rowtype;
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

  select * into v_existing
  from public.app_opportunity_signups
  where opportunity_id = p_opportunity_id
    and email = v_email
  for update;

  if found and v_existing.status not in ('cancelled', 'declined') then
    return v_existing;
  end if;

  v_confirmed_count := public.app_opportunity_confirmed_count(p_opportunity_id);
  if v_opp.capacity > 0 and v_confirmed_count >= v_opp.capacity then
    v_status := case when v_opp.waitlist_enabled then 'waitlisted'::signup_status else 'declined'::signup_status end;
  end if;

  insert into public.app_opportunity_signups (
    id,
    opportunity_id,
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
    v_user_id,
    v_email,
    coalesce(nullif(p_volunteer_name, ''), 'Volunteer'),
    v_opp.title,
    v_opp.type,
    v_opp.category,
    v_opp.time,
    v_opp.location,
    v_opp.commitment,
    0,
    v_status,
    v_now,
    case when v_status = 'waitlisted' then v_now else null end,
    case when v_status = 'declined' then v_now else null end,
    v_now
  )
  on conflict (opportunity_id, email) do update
  set volunteer_user_id = excluded.volunteer_user_id,
      volunteer_name = excluded.volunteer_name,
      title = excluded.title,
      type = excluded.type,
      category = excluded.category,
      time = excluded.time,
      location = excluded.location,
      commitment = excluded.commitment,
      status = excluded.status,
      signed_up_at = v_now,
      waitlisted_at = excluded.waitlisted_at,
      declined_at = excluded.declined_at,
      cancelled_at = null,
      updated_at = v_now
  returning * into v_saved;

  return v_saved;
end;
$$;

revoke all on function public.create_opportunity_signup_with_capacity(uuid, text, text) from public;
grant execute on function public.create_opportunity_signup_with_capacity(uuid, text, text) to authenticated;

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
  v_signup public.app_opportunity_signups%rowtype;
  v_opp public.app_opportunities%rowtype;
  v_confirmed_count integer := 0;
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

  select * into v_opp
  from public.app_opportunities
  where id = v_signup.opportunity_id
  for share;

  if p_status = 'confirmed' and found and v_opp.capacity > 0 then
    select count(*)::integer into v_confirmed_count
    from public.app_opportunity_signups
    where opportunity_id = v_signup.opportunity_id
      and status in ('confirmed', 'completed')
      and id <> v_signup.id;

    if v_confirmed_count >= v_opp.capacity then
      v_final_status := case when v_opp.waitlist_enabled then 'waitlisted'::signup_status else 'declined'::signup_status end;
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

  return v_signup;
end;
$$;

revoke all on function public.review_opportunity_signup_with_capacity(uuid, signup_status, text) from public;
grant execute on function public.review_opportunity_signup_with_capacity(uuid, signup_status, text) to authenticated;
