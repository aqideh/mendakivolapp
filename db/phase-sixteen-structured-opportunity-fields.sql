-- Phase 16: Structured opportunity/session fields
-- Run this after:
-- 1. db/phase-one-schema.sql
-- 2. db/phase-eight-supabase-signups.sql
-- 3. db/phase-nine-supabase-attendance.sql
-- 4. db/phase-ten-supabase-training.sql
-- 5. db/phase-eleven-supabase-content.sql
-- 6. db/phase-twelve-supabase-notifications.sql
-- 7. db/phase-thirteen-attendance-code-validation.sql
-- 8. db/phase-fourteen-transactional-attendance.sql
-- 9. db/phase-fifteen-capacity-waitlist.sql

alter table public.app_opportunities
add column if not exists default_hours numeric(5,2) not null default 0;

alter table public.app_opportunities
add column if not exists starts_at timestamptz;

alter table public.app_opportunities
add column if not exists ends_at timestamptz;

create index if not exists idx_app_opportunities_starts_at
on public.app_opportunities(starts_at);

-- Backfill a few existing seeded opportunities with approximate structured hours.
-- Admins should replace these with actual session details from the app.
update public.app_opportunities
set default_hours = case id
  when '0' then 2
  when '1' then 2
  when '2' then 1
  when '3' then 4
  when '4' then 3
  when '5' then 8
  else default_hours
end
where default_hours = 0;

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
    coalesce(v_opp.default_hours, 0),
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
      hours = excluded.hours,
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
