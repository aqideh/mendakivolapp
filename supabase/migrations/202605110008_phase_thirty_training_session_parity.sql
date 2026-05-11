-- Phase 30 - Training Session Parity
-- Add true training session instances while preserving the current app_training_sessions table as the visible training catalog.

alter table public.app_training_sessions
  add column if not exists parent_training_id text,
  add column if not exists session_title text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists default_hours numeric not null default 0,
  add column if not exists is_session_instance boolean not null default false;

update public.app_training_sessions
set parent_training_id = coalesce(parent_training_id, id),
    session_title = coalesce(nullif(session_title, ''), title),
    starts_at = coalesce(starts_at, case when session_date is not null then session_date::timestamptz else null end),
    is_session_instance = coalesce(is_session_instance, false)
where parent_training_id is null
   or nullif(session_title, '') is null
   or starts_at is null;

alter table public.app_training_signups
  add column if not exists training_session_id text,
  add column if not exists session_title text,
  add column if not exists completed_session_at timestamptz;

update public.app_training_signups
set training_session_id = coalesce(training_session_id, training_id),
    session_title = coalesce(nullif(session_title, ''), title),
    completed_session_at = coalesce(completed_session_at, completed_at)
where training_session_id is null
   or nullif(session_title, '') is null;

alter table public.app_training_signups
  add constraint app_training_signups_training_session_id_fkey
  foreign key (training_session_id)
  references public.app_training_sessions(id)
  on delete set null
  not valid;

alter table public.app_training_signups validate constraint app_training_signups_training_session_id_fkey;

create index if not exists idx_app_training_sessions_parent on public.app_training_sessions(parent_training_id);
create index if not exists idx_app_training_sessions_instance_starts on public.app_training_sessions(parent_training_id, starts_at) where is_session_instance = true;
create index if not exists idx_app_training_signups_training_session_id on public.app_training_signups(training_session_id);
create index if not exists idx_app_training_signups_session_status on public.app_training_signups(training_session_id, status);

create or replace function public.app_default_training_session_id(p_training_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.app_training_sessions s
  where s.id = p_training_id
     or s.parent_training_id = p_training_id
  order by
    case when s.id = p_training_id then 0 else 1 end,
    case when s.starts_at is null then 1 else 0 end,
    s.starts_at asc,
    s.created_at asc
  limit 1;
$$;

create or replace function public.app_training_session_registered_count(p_training_session_id text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.app_training_signups s
  where coalesce(s.training_session_id, s.training_id) = p_training_session_id
    and s.status in ('registered', 'completed');
$$;

create or replace function public.create_training_session_signup_with_capacity(
  p_signup_id uuid,
  p_training_id text,
  p_training_session_id text default null,
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
  v_parent public.app_training_sessions%rowtype;
  v_session public.app_training_sessions%rowtype;
  v_existing public.app_training_signups%rowtype;
  v_had_existing boolean := false;
  v_status training_signup_status := 'registered'::training_signup_status;
  v_registered_count integer := 0;
  v_now timestamptz := now();
  v_saved public.app_training_signups%rowtype;
  v_session_id text;
begin
  v_email := auth.email();
  v_user_id := public.current_app_user_id();

  if v_email is null then
    raise exception 'Sign in required';
  end if;

  select * into v_parent
  from public.app_training_sessions
  where id = p_training_id
  for share;

  if not found then
    raise exception 'Training not found: %', p_training_id;
  end if;

  v_session_id := coalesce(nullif(p_training_session_id, ''), public.app_default_training_session_id(p_training_id), p_training_id);

  select * into v_session
  from public.app_training_sessions
  where id = v_session_id
    and (id = p_training_id or parent_training_id = p_training_id)
  for share;

  if not found then
    raise exception 'Training session not found for training: %', p_training_id;
  end if;

  select * into v_existing
  from public.app_training_signups
  where training_id = p_training_id
    and coalesce(training_session_id, training_id) = v_session.id
    and email = v_email
  for update;

  v_had_existing := found;

  if v_had_existing and v_existing.status not in ('cancelled', 'declined') then
    return v_existing;
  end if;

  v_registered_count := public.app_training_session_registered_count(v_session.id);
  if coalesce(v_session.capacity, v_parent.capacity, 0) > 0 and v_registered_count >= coalesce(v_session.capacity, v_parent.capacity, 0) then
    v_status := case when coalesce(v_session.waitlist_enabled, v_parent.waitlist_enabled, true) then 'waitlisted'::training_signup_status else 'declined'::training_signup_status end;
  end if;

  insert into public.app_training_signups (
    id,
    training_id,
    training_session_id,
    volunteer_user_id,
    email,
    volunteer_name,
    title,
    session_title,
    session_date,
    time,
    location,
    trainer,
    status,
    signed_up_at,
    cancelled_at,
    completed_at,
    completed_session_at,
    reviewed_by_email,
    reviewed_at,
    admin_notes,
    updated_at
  ) values (
    coalesce(p_signup_id, gen_random_uuid()),
    p_training_id,
    v_session.id,
    v_user_id,
    v_email,
    coalesce(nullif(p_volunteer_name, ''), 'Volunteer'),
    v_parent.title,
    coalesce(nullif(v_session.session_title, ''), v_session.title, v_parent.title),
    coalesce(v_session.session_date, v_parent.session_date),
    coalesce(nullif(v_session.time, ''), nullif(v_parent.time, ''), ''),
    coalesce(nullif(v_session.location, ''), nullif(v_parent.location, ''), ''),
    coalesce(nullif(v_session.trainer, ''), nullif(v_parent.trainer, '')),
    v_status,
    v_now,
    null,
    null,
    null,
    null,
    null,
    null,
    v_now
  )
  on conflict (id) do update
  set training_id = excluded.training_id,
      training_session_id = excluded.training_session_id,
      volunteer_user_id = excluded.volunteer_user_id,
      volunteer_name = excluded.volunteer_name,
      title = excluded.title,
      session_title = excluded.session_title,
      session_date = excluded.session_date,
      time = excluded.time,
      location = excluded.location,
      trainer = excluded.trainer,
      status = excluded.status,
      signed_up_at = excluded.signed_up_at,
      cancelled_at = null,
      completed_at = null,
      completed_session_at = null,
      reviewed_by_email = null,
      reviewed_at = null,
      admin_notes = null,
      updated_at = v_now
  returning * into v_saved;

  perform public.log_app_audit_event(
    case when v_had_existing then 'training_session_signup_reactivated' else 'training_session_signup_created' end,
    'app_training_signups',
    v_saved.id::text,
    v_saved.email,
    case when v_had_existing then to_jsonb(v_existing) else null end,
    to_jsonb(v_saved),
    jsonb_build_object(
      'training_id', v_saved.training_id,
      'training_session_id', v_saved.training_session_id,
      'training_title', v_saved.title,
      'session_title', v_saved.session_title,
      'status', v_saved.status,
      'capacity', coalesce(v_session.capacity, v_parent.capacity, 0),
      'waitlist_enabled', coalesce(v_session.waitlist_enabled, v_parent.waitlist_enabled, true),
      'registered_count_before', v_registered_count
    )
  );

  return v_saved;
end;
$$;

create or replace function public.create_training_signup_with_capacity(
  p_signup_id uuid,
  p_training_id text,
  p_volunteer_name text default 'Volunteer'
)
returns public.app_training_signups
language sql
security definer
set search_path = public
as $$
  select public.create_training_session_signup_with_capacity(
    p_signup_id,
    p_training_id,
    public.app_default_training_session_id(p_training_id),
    p_volunteer_name
  );
$$;

create or replace function public.cancel_training_signup(p_signup_id uuid, p_cancellation_reason text default null)
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
      'training_session_id', v_signup.training_session_id,
      'training_title', v_signup.title,
      'session_title', v_signup.session_title,
      'previous_status', v_previous.status,
      'reason_present', nullif(p_cancellation_reason, '') is not null
    )
  );

  if v_previous.status = 'registered' then
    perform public.promote_next_training_waitlist(v_signup.training_id);
  end if;

  return v_signup;
end;
$$;

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
  v_session public.app_training_sessions%rowtype;
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

  select * into v_session
  from public.app_training_sessions
  where id = coalesce(v_signup.training_session_id, v_signup.training_id)
  for share;

  if p_status = 'registered' and coalesce(v_signup.training_session_id, v_signup.training_id) is not null and coalesce(v_session.capacity, v_training.capacity, 0) > 0 then
    select count(*)::integer into v_registered_count
    from public.app_training_signups
    where coalesce(training_session_id, training_id) = coalesce(v_signup.training_session_id, v_signup.training_id)
      and status in ('registered', 'completed')
      and id <> v_signup.id;

    if v_registered_count >= coalesce(v_session.capacity, v_training.capacity, 0) then
      v_final_status := case when coalesce(v_session.waitlist_enabled, v_training.waitlist_enabled, true) then 'waitlisted'::training_signup_status else 'declined'::training_signup_status end;
    end if;
  end if;

  update public.app_training_signups
  set status = v_final_status,
      completed_at = case when v_final_status = 'completed' then coalesce(completed_at, v_now) else completed_at end,
      completed_session_at = case when v_final_status = 'completed' then coalesce(completed_session_at, v_now) else completed_session_at end,
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
    when 'registered' then 'Your registration for ' || coalesce(v_signup.session_title, v_signup.title, 'training') || ' has been confirmed.'
    when 'waitlisted' then 'You have been waitlisted for ' || coalesce(v_signup.session_title, v_signup.title, 'training') || '.'
    when 'completed' then 'Your completion for ' || coalesce(v_signup.session_title, v_signup.title, 'training') || ' has been recorded.'
    when 'declined' then 'Your registration for ' || coalesce(v_signup.session_title, v_signup.title, 'training') || ' was declined.'
    when 'no_show' then 'Your attendance for ' || coalesce(v_signup.session_title, v_signup.title, 'training') || ' was marked as no-show.'
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
      is_read,
      metadata
    ) values (
      v_signup.email,
      'volunteer',
      v_notification_title,
      v_notification_message,
      v_notification_type,
      'app_training_signups',
      v_signup.id::text,
      false,
      jsonb_build_object('training_id', v_signup.training_id, 'training_session_id', v_signup.training_session_id)
    )
    returning id into v_notification_id;
  else
    update public.app_notifications
    set title = v_notification_title,
        message = v_notification_message,
        is_read = false,
        read_at = null,
        created_at = v_now,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('training_id', v_signup.training_id, 'training_session_id', v_signup.training_session_id)
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
      'training_session_id', v_signup.training_session_id,
      'training_title', v_signup.title,
      'session_title', v_signup.session_title,
      'capacity', coalesce(v_session.capacity, v_training.capacity, 0),
      'waitlist_enabled', coalesce(v_session.waitlist_enabled, v_training.waitlist_enabled, true),
      'registered_count_before_review', v_registered_count,
      'capacity_adjusted', p_status <> v_final_status,
      'notification_id', v_notification_id
    )
  );

  return v_signup;
end;
$$;

create or replace function public.award_training_completion_points(p_training_signup_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signup record;
  v_user_id uuid;
begin
  select * into v_signup
  from public.app_training_signups
  where id = p_training_signup_id
  limit 1;

  if v_signup.id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_training_signup');
  end if;

  if coalesce(v_signup.status::text, '') <> 'completed' then
    return jsonb_build_object('ok', false, 'reason', 'training_not_completed');
  end if;

  v_user_id := public.resolve_app_user_id(v_signup.email, v_signup.volunteer_user_id);
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_user');
  end if;

  return public.award_points_once(
    v_user_id,
    10,
    'training_completed',
    'app_training_signups',
    p_training_signup_id,
    jsonb_build_object(
      'title', coalesce(v_signup.title, ''),
      'session_title', coalesce(v_signup.session_title, ''),
      'training_id', v_signup.training_id,
      'training_session_id', v_signup.training_session_id
    )
  );
end;
$$;

revoke execute on function public.app_default_training_session_id(text) from public, anon;
revoke execute on function public.app_training_session_registered_count(text) from public, anon;
revoke execute on function public.create_training_session_signup_with_capacity(uuid, text, text, text) from public, anon;
grant execute on function public.app_default_training_session_id(text) to authenticated;
grant execute on function public.app_training_session_registered_count(text) to authenticated;
grant execute on function public.create_training_session_signup_with_capacity(uuid, text, text, text) to authenticated;
