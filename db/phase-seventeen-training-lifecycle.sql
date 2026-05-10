-- Phase 17: Training lifecycle and capacity enforcement
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
-- 10. db/phase-sixteen-structured-opportunity-fields.sql

alter type public.training_signup_status add value if not exists 'waitlisted';
alter type public.training_signup_status add value if not exists 'declined';
alter type public.training_signup_status add value if not exists 'no_show';

alter table public.app_training_sessions
add column if not exists waitlist_enabled boolean not null default true;

create index if not exists idx_app_training_signups_capacity_counts
on public.app_training_signups(training_id, status);

create or replace function public.app_training_registered_count(p_training_id text)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.app_training_signups s
  where s.training_id = p_training_id
    and s.status in ('registered', 'completed');
$$;

create or replace function public.create_training_signup_with_capacity(
  p_signup_id uuid,
  p_training_id text,
  p_volunteer_name text default 'Volunteer'
)
returns public.app_training_signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_training public.app_training_sessions%rowtype;
  v_existing public.app_training_signups%rowtype;
  v_status training_signup_status := 'registered'::training_signup_status;
  v_registered_count integer := 0;
  v_now timestamptz := now();
  v_saved public.app_training_signups%rowtype;
begin
  v_email := auth.email();
  v_user_id := public.current_app_user_id();

  if v_email is null then
    raise exception 'Sign in required';
  end if;

  select * into v_training
  from public.app_training_sessions
  where id = p_training_id
  for share;

  if not found then
    raise exception 'Training session not found: %', p_training_id;
  end if;

  select * into v_existing
  from public.app_training_signups
  where training_id = p_training_id
    and email = v_email
  for update;

  if found and v_existing.status not in ('cancelled', 'declined') then
    return v_existing;
  end if;

  v_registered_count := public.app_training_registered_count(p_training_id);
  if v_training.capacity > 0 and v_registered_count >= v_training.capacity then
    v_status := case when v_training.waitlist_enabled then 'waitlisted'::training_signup_status else 'declined'::training_signup_status end;
  end if;

  insert into public.app_training_signups (
    id,
    training_id,
    volunteer_user_id,
    email,
    volunteer_name,
    title,
    session_date,
    time,
    location,
    trainer,
    status,
    signed_up_at,
    cancelled_at,
    completed_at,
    reviewed_by_email,
    reviewed_at,
    admin_notes,
    updated_at
  ) values (
    coalesce(p_signup_id, gen_random_uuid()),
    p_training_id,
    v_user_id,
    v_email,
    coalesce(nullif(p_volunteer_name, ''), 'Volunteer'),
    v_training.title,
    v_training.session_date,
    v_training.time,
    v_training.location,
    v_training.trainer,
    v_status,
    v_now,
    null,
    null,
    null,
    null,
    null,
    v_now
  )
  on conflict (training_id, email) do update
  set volunteer_user_id = excluded.volunteer_user_id,
      volunteer_name = excluded.volunteer_name,
      title = excluded.title,
      session_date = excluded.session_date,
      time = excluded.time,
      location = excluded.location,
      trainer = excluded.trainer,
      status = excluded.status,
      signed_up_at = v_now,
      cancelled_at = null,
      completed_at = null,
      reviewed_by_email = null,
      reviewed_at = null,
      admin_notes = null,
      updated_at = v_now
  returning * into v_saved;

  return v_saved;
end;
$$;

revoke all on function public.create_training_signup_with_capacity(uuid, text, text) from public;
grant execute on function public.create_training_signup_with_capacity(uuid, text, text) to authenticated;

create or replace function public.review_training_signup_lifecycle(
  p_signup_id uuid,
  p_status training_signup_status,
  p_admin_notes text default null
)
returns public.app_training_signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_signup public.app_training_signups%rowtype;
  v_training public.app_training_sessions%rowtype;
  v_registered_count integer := 0;
  v_final_status training_signup_status := p_status;
  v_now timestamptz := now();
  v_notification_title text;
  v_notification_message text;
  v_notification_type text;
  v_notification_id uuid;
begin
  v_role := public.current_app_role();
  if v_role not in ('admin', 'super_admin') then
    raise exception 'Only admins can review training sign-ups';
  end if;

  if p_status not in ('registered', 'waitlisted', 'completed', 'cancelled', 'declined', 'no_show') then
    raise exception 'Invalid training review status: %', p_status;
  end if;

  select * into v_signup
  from public.app_training_signups
  where id = p_signup_id
  for update;

  if not found then
    raise exception 'Training sign-up not found: %', p_signup_id;
  end if;

  select * into v_training
  from public.app_training_sessions
  where id = v_signup.training_id
  for share;

  if p_status = 'registered' and found and v_training.capacity > 0 then
    select count(*)::integer into v_registered_count
    from public.app_training_signups
    where training_id = v_signup.training_id
      and status in ('registered', 'completed')
      and id <> v_signup.id;

    if v_registered_count >= v_training.capacity then
      v_final_status := case when v_training.waitlist_enabled then 'waitlisted'::training_signup_status else 'declined'::training_signup_status end;
    end if;
  end if;

  update public.app_training_signups
  set status = v_final_status,
      completed_at = case when v_final_status = 'completed' then coalesce(completed_at, v_now) else completed_at end,
      cancelled_at = case when v_final_status in ('cancelled', 'declined', 'no_show') then coalesce(cancelled_at, v_now) else cancelled_at end,
      reviewed_by_email = auth.email(),
      reviewed_at = v_now,
      admin_notes = nullif(p_admin_notes, ''),
      updated_at = v_now
  where id = p_signup_id
  returning * into v_signup;

  v_notification_title := case v_final_status
    when 'registered' then 'Training registration confirmed'
    when 'waitlisted' then 'Training waitlisted'
    when 'completed' then 'Training completed'
    when 'declined' then 'Training registration declined'
    when 'no_show' then 'Training marked no-show'
    else 'Training updated'
  end;

  v_notification_message := case v_final_status
    when 'registered' then 'Your registration for ' || coalesce(v_signup.title, 'training') || ' has been confirmed.'
    when 'waitlisted' then 'You have been waitlisted for ' || coalesce(v_signup.title, 'training') || '.'
    when 'completed' then 'Your completion for ' || coalesce(v_signup.title, 'training') || ' has been recorded.'
    when 'declined' then 'Your registration for ' || coalesce(v_signup.title, 'training') || ' was declined.'
    when 'no_show' then 'Your attendance for ' || coalesce(v_signup.title, 'training') || ' was marked as no-show.'
    else 'Your training registration has been updated.'
  end;

  v_notification_type := 'training_' || v_final_status::text;

  select id into v_notification_id
  from public.app_notifications
  where recipient_email = v_signup.email
    and notification_type = v_notification_type
    and coalesce(related_table, '') = 'app_training_signups'
    and coalesce(related_id, '') = v_signup.id::text
    and cleared_at is null
  order by created_at asc
  limit 1
  for update;

  if v_notification_id is null then
    insert into public.app_notifications (
      recipient_email,
      recipient_role,
      title,
      message,
      notification_type,
      related_table,
      related_id,
      is_read
    ) values (
      v_signup.email,
      'volunteer',
      v_notification_title,
      v_notification_message,
      v_notification_type,
      'app_training_signups',
      v_signup.id::text,
      false
    )
    returning id into v_notification_id;
  else
    update public.app_notifications
    set title = v_notification_title,
        message = v_notification_message,
        is_read = false,
        read_at = null,
        created_at = v_now
    where id = v_notification_id;
  end if;

  return v_signup;
end;
$$;

revoke all on function public.review_training_signup_lifecycle(uuid, training_signup_status, text) from public;
grant execute on function public.review_training_signup_lifecycle(uuid, training_signup_status, text) to authenticated;
