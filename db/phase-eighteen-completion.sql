-- Phase 18 completion: close remaining authoritative write and audit gaps
-- Run after db/phase-eighteen-audit-logging.sql.

create extension if not exists pgcrypto;

-- Audited training cancellation RPC used by the Phase 18 frontend guard.
create or replace function public.cancel_training_signup(
  p_signup_id uuid,
  p_cancellation_reason text default null
)
returns public.app_training_signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_previous public.app_training_signups%rowtype;
  v_signup public.app_training_signups%rowtype;
  v_now timestamptz := now();
begin
  select * into v_signup
  from public.app_training_signups
  where id = p_signup_id
  for update;

  if not found then
    raise exception 'Training sign-up not found: %', p_signup_id;
  end if;

  v_role := public.current_app_role();
  if auth.email() <> v_signup.email and v_role not in ('admin', 'super_admin') then
    raise exception 'Only the volunteer or an admin can cancel this training sign-up';
  end if;

  if v_signup.status = 'completed' then
    raise exception 'Completed training sign-ups cannot be cancelled';
  end if;

  v_previous := v_signup;

  update public.app_training_signups
  set status = 'cancelled',
      cancelled_at = v_now,
      admin_notes = case
        when v_role in ('admin', 'super_admin') and nullif(p_cancellation_reason, '') is not null
        then nullif(p_cancellation_reason, '')
        else admin_notes
      end,
      updated_at = v_now
  where id = p_signup_id
  returning * into v_signup;

  perform public.log_app_audit_event(
    case when v_role in ('admin', 'super_admin') and auth.email() <> v_signup.email then 'training_signup_cancelled_by_admin' else 'training_signup_cancelled_by_volunteer' end,
    'app_training_signups',
    v_signup.id::text,
    v_signup.email,
    to_jsonb(v_previous),
    to_jsonb(v_signup),
    jsonb_build_object(
      'training_id', v_signup.training_id,
      'training_title', v_signup.title,
      'previous_status', v_previous.status,
      'reason_present', nullif(p_cancellation_reason, '') is not null
    )
  );

  return v_signup;
end;
$$;

revoke all on function public.cancel_training_signup(uuid, text) from public;
grant execute on function public.cancel_training_signup(uuid, text) to authenticated;

-- Recreate training signup creation with audit logging.
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
  v_had_existing boolean := false;
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

  v_had_existing := found;

  if v_had_existing and v_existing.status not in ('cancelled', 'declined') then
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

  perform public.log_app_audit_event(
    case when v_had_existing then 'training_signup_reactivated' else 'training_signup_created' end,
    'app_training_signups',
    v_saved.id::text,
    v_saved.email,
    case when v_had_existing then to_jsonb(v_existing) else null end,
    to_jsonb(v_saved),
    jsonb_build_object(
      'training_id', v_saved.training_id,
      'training_title', v_saved.title,
      'status', v_saved.status,
      'capacity', v_training.capacity,
      'waitlist_enabled', v_training.waitlist_enabled,
      'registered_count_before', v_registered_count
    )
  );

  return v_saved;
end;
$$;

revoke all on function public.create_training_signup_with_capacity(uuid, text, text) from public;
grant execute on function public.create_training_signup_with_capacity(uuid, text, text) to authenticated;

-- Recreate training lifecycle review with audit logging and notification audit metadata.
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
  v_previous public.app_training_signups%rowtype;
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

  v_previous := v_signup;

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

  perform public.log_app_audit_event(
    'training_signup_reviewed',
    'app_training_signups',
    v_signup.id::text,
    v_signup.email,
    to_jsonb(v_previous),
    to_jsonb(v_signup),
    jsonb_build_object(
      'requested_status', p_status,
      'final_status', v_final_status,
      'training_id', v_signup.training_id,
      'training_title', v_signup.title,
      'capacity', v_training.capacity,
      'waitlist_enabled', v_training.waitlist_enabled,
      'registered_count_before_review', v_registered_count,
      'capacity_adjusted', p_status <> v_final_status,
      'notification_id', v_notification_id
    )
  );

  return v_signup;
end;
$$;

revoke all on function public.review_training_signup_lifecycle(uuid, training_signup_status, text) from public;
grant execute on function public.review_training_signup_lifecycle(uuid, training_signup_status, text) to authenticated;

-- Recreate transactional attendance review with audit logging.
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
  v_previous_claim public.app_attendance_claims%rowtype;
  v_previous_signup public.app_opportunity_signups%rowtype;
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

  v_previous_claim := v_claim;

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
      v_previous_signup := v_signup;
      if v_status in ('verified', 'adjusted') then
        update public.app_opportunity_signups
        set status = 'completed'::signup_status,
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

  select id into v_notification_id
  from public.app_notifications
  where recipient_email = v_claim.email
    and notification_type = v_notification_type
    and coalesce(related_table, '') = 'app_attendance_claims'
    and coalesce(related_id, '') = v_claim.id::text
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
      v_claim.email,
      'volunteer',
      v_notification_title,
      v_notification_message,
      v_notification_type,
      'app_attendance_claims',
      v_claim.id::text,
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

  perform public.log_app_audit_event(
    'attendance_claim_reviewed',
    'app_attendance_claims',
    v_claim.id::text,
    v_claim.email,
    jsonb_build_object('claim', to_jsonb(v_previous_claim), 'signup', to_jsonb(v_previous_signup)),
    jsonb_build_object('claim', to_jsonb(v_claim), 'signup', to_jsonb(v_signup)),
    jsonb_build_object(
      'action', p_action,
      'final_status', v_status,
      'opportunity_id', v_claim.opportunity_id,
      'opportunity_title', v_claim.title,
      'verified_hours', v_verified_hours,
      'notification_id', v_notification_id
    )
  );

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

-- Generic audited content update helpers for admin-managed records.
create or replace function public.log_content_edit(
  p_entity_table text,
  p_entity_id text,
  p_previous_state jsonb default null,
  p_new_state jsonb default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() not in ('admin', 'super_admin') then
    raise exception 'Only admins can log content edits';
  end if;

  if p_entity_table not in ('app_opportunities', 'app_training_sessions', 'app_news_items', 'app_notifications') then
    raise exception 'Unsupported content audit table: %', p_entity_table;
  end if;

  return public.log_app_audit_event(
    'content_edited',
    p_entity_table,
    p_entity_id,
    null,
    p_previous_state,
    p_new_state,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_content_edit(text, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.log_content_edit(text, text, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.log_notification_audit(
  p_action text,
  p_notification_id text,
  p_target_user_email text default null,
  p_previous_state jsonb default null,
  p_new_state jsonb default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() not in ('admin', 'super_admin') then
    raise exception 'Only admins can log notification audit events';
  end if;

  if p_action not in ('notification_created', 'notification_cleared', 'notification_updated') then
    raise exception 'Unsupported notification audit action: %', p_action;
  end if;

  return public.log_app_audit_event(
    p_action,
    'app_notifications',
    p_notification_id,
    p_target_user_email,
    p_previous_state,
    p_new_state,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_notification_audit(text, text, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.log_notification_audit(text, text, text, jsonb, jsonb, jsonb) to authenticated;
