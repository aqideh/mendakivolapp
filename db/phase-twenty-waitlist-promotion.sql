-- Phase 20: Waitlist promotion automation
-- Run after:
-- 1. db/phase-eighteen-audit-logging.sql
-- 2. db/phase-eighteen-completion.sql
-- 3. db/phase-nineteen-opportunity-sessions.sql
--
-- Adds automatic promotion for opportunity and training waitlists when a
-- confirmed/registered participant cancels. Promotion happens in the same
-- transaction as cancellation and writes audit logs + notifications.

create extension if not exists pgcrypto;

create or replace function public.promote_next_opportunity_waitlist(
  p_session_id uuid,
  p_opportunity_id text default null
)
returns public.app_opportunity_signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.app_opportunity_sessions%rowtype;
  v_opp public.app_opportunities%rowtype;
  v_candidate public.app_opportunity_signups%rowtype;
  v_previous public.app_opportunity_signups%rowtype;
  v_confirmed_count integer := 0;
  v_capacity integer := 0;
  v_now timestamptz := now();
  v_notification_id uuid;
begin
  if p_session_id is null and nullif(p_opportunity_id, '') is null then
    return null;
  end if;

  if p_session_id is not null then
    select * into v_session
    from public.app_opportunity_sessions
    where id = p_session_id
    for update;
  else
    select * into v_session
    from public.app_opportunity_sessions
    where opportunity_id = p_opportunity_id
    order by starts_at nulls last, created_at asc
    limit 1
    for update;
  end if;

  if found then
    v_capacity := coalesce(v_session.capacity, 0);
    select count(*)::integer into v_confirmed_count
    from public.app_opportunity_signups
    where session_id = v_session.id
      and status in ('confirmed', 'completed');
  else
    select * into v_opp
    from public.app_opportunities
    where id = p_opportunity_id
    for update;

    if not found then
      return null;
    end if;

    v_capacity := coalesce(v_opp.capacity, 0);
    select count(*)::integer into v_confirmed_count
    from public.app_opportunity_signups
    where opportunity_id = p_opportunity_id
      and status in ('confirmed', 'completed');
  end if;

  if v_capacity > 0 and v_confirmed_count >= v_capacity then
    return null;
  end if;

  select * into v_candidate
  from public.app_opportunity_signups
  where status = 'waitlisted'
    and (
      (v_session.id is not null and session_id = v_session.id)
      or (v_session.id is null and opportunity_id = p_opportunity_id)
    )
  order by waitlisted_at nulls last, signed_up_at nulls last, updated_at asc
  limit 1
  for update skip locked;

  if not found then
    return null;
  end if;

  v_previous := v_candidate;

  update public.app_opportunity_signups
  set status = 'confirmed'::signup_status,
      confirmed_at = coalesce(confirmed_at, v_now),
      reviewed_at = v_now,
      reviewed_by_email = coalesce(auth.email(), reviewed_by_email),
      admin_notes = coalesce(admin_notes, '') || case when coalesce(admin_notes, '') = '' then '' else E'\n' end || 'Auto-promoted from waitlist.',
      updated_at = v_now
  where id = v_candidate.id
  returning * into v_candidate;

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
    v_candidate.email,
    'volunteer',
    'Waitlist spot confirmed',
    'A spot opened for ' || coalesce(v_candidate.title, 'your opportunity') || '. You have been promoted from the waitlist.',
    'opportunity_waitlist_promoted',
    'app_opportunity_signups',
    v_candidate.id::text,
    false
  )
  returning id into v_notification_id;

  perform public.log_app_audit_event(
    'opportunity_waitlist_promoted',
    'app_opportunity_signups',
    v_candidate.id::text,
    v_candidate.email,
    to_jsonb(v_previous),
    to_jsonb(v_candidate),
    jsonb_build_object(
      'opportunity_id', v_candidate.opportunity_id,
      'session_id', v_candidate.session_id,
      'opportunity_title', v_candidate.title,
      'capacity', v_capacity,
      'confirmed_count_before_promotion', v_confirmed_count,
      'notification_id', v_notification_id
    )
  );

  return v_candidate;
end;
$$;

revoke all on function public.promote_next_opportunity_waitlist(uuid, text) from public;
grant execute on function public.promote_next_opportunity_waitlist(uuid, text) to authenticated;

create or replace function public.promote_next_training_waitlist(
  p_training_id text
)
returns public.app_training_signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_training public.app_training_sessions%rowtype;
  v_candidate public.app_training_signups%rowtype;
  v_previous public.app_training_signups%rowtype;
  v_registered_count integer := 0;
  v_capacity integer := 0;
  v_now timestamptz := now();
  v_notification_id uuid;
begin
  if nullif(p_training_id, '') is null then
    return null;
  end if;

  select * into v_training
  from public.app_training_sessions
  where id = p_training_id
  for update;

  if not found then
    return null;
  end if;

  v_capacity := coalesce(v_training.capacity, 0);
  select count(*)::integer into v_registered_count
  from public.app_training_signups
  where training_id = p_training_id
    and status in ('registered', 'completed');

  if v_capacity > 0 and v_registered_count >= v_capacity then
    return null;
  end if;

  select * into v_candidate
  from public.app_training_signups
  where training_id = p_training_id
    and status = 'waitlisted'
  order by signed_up_at nulls last, created_at asc
  limit 1
  for update skip locked;

  if not found then
    return null;
  end if;

  v_previous := v_candidate;

  update public.app_training_signups
  set status = 'registered'::training_signup_status,
      reviewed_at = v_now,
      reviewed_by_email = coalesce(auth.email(), reviewed_by_email),
      admin_notes = coalesce(admin_notes, '') || case when coalesce(admin_notes, '') = '' then '' else E'\n' end || 'Auto-promoted from waitlist.',
      updated_at = v_now
  where id = v_candidate.id
  returning * into v_candidate;

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
    v_candidate.email,
    'volunteer',
    'Training waitlist spot confirmed',
    'A spot opened for ' || coalesce(v_candidate.title, 'your training session') || '. You have been promoted from the waitlist.',
    'training_waitlist_promoted',
    'app_training_signups',
    v_candidate.id::text,
    false
  )
  returning id into v_notification_id;

  perform public.log_app_audit_event(
    'training_waitlist_promoted',
    'app_training_signups',
    v_candidate.id::text,
    v_candidate.email,
    to_jsonb(v_previous),
    to_jsonb(v_candidate),
    jsonb_build_object(
      'training_id', v_candidate.training_id,
      'training_title', v_candidate.title,
      'capacity', v_capacity,
      'registered_count_before_promotion', v_registered_count,
      'notification_id', v_notification_id
    )
  );

  return v_candidate;
end;
$$;

revoke all on function public.promote_next_training_waitlist(text) from public;
grant execute on function public.promote_next_training_waitlist(text) to authenticated;

-- Recreate opportunity cancellation so confirmed cancellation triggers same-transaction promotion.
create or replace function public.cancel_opportunity_signup(
  p_signup_id uuid,
  p_cancellation_reason text default null
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
  v_promoted public.app_opportunity_signups%rowtype;
  v_now timestamptz := now();
begin
  select * into v_signup
  from public.app_opportunity_signups
  where id = p_signup_id
  for update;

  if not found then
    raise exception 'Sign-up not found: %', p_signup_id;
  end if;

  v_role := public.current_app_role();
  if auth.email() <> v_signup.email and v_role not in ('admin', 'super_admin') then
    raise exception 'Only the volunteer or an admin can cancel this sign-up';
  end if;

  if v_signup.status = 'completed' then
    raise exception 'Completed sign-ups cannot be cancelled';
  end if;

  v_previous := v_signup;

  update public.app_opportunity_signups
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
    case when v_role in ('admin', 'super_admin') and auth.email() <> v_signup.email then 'opportunity_signup_cancelled_by_admin' else 'opportunity_signup_cancelled_by_volunteer' end,
    'app_opportunity_signups',
    v_signup.id::text,
    v_signup.email,
    to_jsonb(v_previous),
    to_jsonb(v_signup),
    jsonb_build_object(
      'opportunity_id', v_signup.opportunity_id,
      'session_id', v_signup.session_id,
      'opportunity_title', v_signup.title,
      'previous_status', v_previous.status,
      'reason_present', nullif(p_cancellation_reason, '') is not null
    )
  );

  if v_previous.status = 'confirmed' then
    v_promoted := public.promote_next_opportunity_waitlist(v_signup.session_id, v_signup.opportunity_id);
  end if;

  return v_signup;
end;
$$;

revoke all on function public.cancel_opportunity_signup(uuid, text) from public;
grant execute on function public.cancel_opportunity_signup(uuid, text) to authenticated;

-- Recreate training cancellation so registered cancellation triggers same-transaction promotion.
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
  v_promoted public.app_training_signups%rowtype;
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

  if v_previous.status = 'registered' then
    v_promoted := public.promote_next_training_waitlist(v_signup.training_id);
  end if;

  return v_signup;
end;
$$;

revoke all on function public.cancel_training_signup(uuid, text) from public;
grant execute on function public.cancel_training_signup(uuid, text) to authenticated;
