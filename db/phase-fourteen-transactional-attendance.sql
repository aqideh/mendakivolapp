-- Phase 14: Transactional attendance verification
-- Run this after:
-- 1. db/phase-one-schema.sql
-- 2. db/phase-eight-supabase-signups.sql
-- 3. db/phase-nine-supabase-attendance.sql
-- 4. db/phase-ten-supabase-training.sql
-- 5. db/phase-eleven-supabase-content.sql
-- 6. db/phase-twelve-supabase-notifications.sql
-- 7. db/phase-thirteen-attendance-code-validation.sql

create extension if not exists pgcrypto;

create or replace function public.review_attendance_claim_transactional(
  p_claim_id uuid,
  p_action text,
  p_verified_hours numeric default 0,
  p_admin_notes text default null
)
returns table (
  claim_id uuid,
  claim_status text,
  signup_id uuid,
  signup_status text,
  notification_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_claim public.app_attendance_claims%rowtype;
  v_signup public.app_opportunity_signups%rowtype;
  v_status attendance_status;
  v_verified_hours numeric := greatest(coalesce(p_verified_hours, 0), 0);
  v_now timestamptz := now();
  v_notification_title text;
  v_notification_message text;
  v_notification_type text;
  v_notification_id uuid;
begin
  v_role := public.current_app_role();
  if v_role not in ('admin', 'super_admin') then
    raise exception 'Only admins can review attendance claims';
  end if;

  if p_action not in ('verify', 'adjust', 'clarify', 'reject') then
    raise exception 'Invalid attendance review action: %', p_action;
  end if;

  select * into v_claim
  from public.app_attendance_claims
  where id = p_claim_id
  for update;

  if not found then
    raise exception 'Attendance claim not found: %', p_claim_id;
  end if;

  v_status := case p_action
    when 'verify' then 'verified'::attendance_status
    when 'adjust' then 'adjusted'::attendance_status
    when 'clarify' then 'clarification_requested'::attendance_status
    when 'reject' then 'rejected'::attendance_status
  end;

  if v_status in ('clarification_requested', 'rejected') then
    v_verified_hours := 0;
  end if;

  update public.app_attendance_claims
  set claim_status = v_status,
      verified_hours = v_verified_hours,
      reviewed_by_email = auth.email(),
      reviewed_at = v_now,
      admin_notes = nullif(p_admin_notes, ''),
      updated_at = v_now
  where id = p_claim_id
  returning * into v_claim;

  if v_claim.signup_id is not null then
    select * into v_signup
    from public.app_opportunity_signups
    where id = v_claim.signup_id
    for update;

    if found then
      if v_status in ('verified', 'adjusted') then
        update public.app_opportunity_signups
        set status = 'completed'::opportunity_signup_status,
            verified_hours = v_verified_hours,
            completed_at = coalesce(completed_at, v_now),
            updated_at = v_now
        where id = v_claim.signup_id
        returning * into v_signup;
      else
        update public.app_opportunity_signups
        set updated_at = v_now
        where id = v_claim.signup_id
        returning * into v_signup;
      end if;
    end if;
  end if;

  v_notification_title := case v_status
    when 'verified' then 'Attendance verified'
    when 'adjusted' then 'Attendance adjusted'
    when 'clarification_requested' then 'Attendance clarification needed'
    when 'rejected' then 'Attendance rejected'
    else 'Attendance updated'
  end;

  v_notification_message := case v_status
    when 'verified' then 'Your attendance for ' || coalesce(v_claim.title, 'your opportunity') || ' has been verified.'
    when 'adjusted' then 'Your attendance hours for ' || coalesce(v_claim.title, 'your opportunity') || ' have been adjusted and verified.'
    when 'clarification_requested' then 'Admin requested clarification for your attendance record: ' || coalesce(v_claim.title, 'your opportunity') || '.'
    when 'rejected' then 'Your attendance record for ' || coalesce(v_claim.title, 'your opportunity') || ' was rejected.'
    else 'Your attendance record has been updated.'
  end;

  v_notification_type := 'attendance_' || v_status::text;

  insert into public.app_notifications (
    recipient_email,
    recipient_role,
    title,
    message,
    notification_type,
    related_table,
    related_id,
    is_read
  )
  values (
    v_claim.email,
    'volunteer',
    v_notification_title,
    v_notification_message,
    v_notification_type,
    'app_attendance_claims',
    v_claim.id::text,
    false
  )
  on conflict (
    recipient_email,
    notification_type,
    coalesce(related_table, ''),
    coalesce(related_id, '')
  ) where cleared_at is null
    and related_id is not null
    and notification_type <> 'admin_task'
  do update set
    title = excluded.title,
    message = excluded.message,
    is_read = false,
    read_at = null,
    created_at = now()
  returning id into v_notification_id;

  return query
  select
    v_claim.id,
    v_claim.claim_status::text,
    v_signup.id,
    v_signup.status::text,
    v_notification_id;
end;
$$;

revoke all on function public.review_attendance_claim_transactional(uuid, text, numeric, text) from public;
grant execute on function public.review_attendance_claim_transactional(uuid, text, numeric, text) to authenticated;
