-- Phase 30 follow-up - allow one volunteer to join multiple sessions under the same parent training.

alter table public.app_training_signups
  drop constraint if exists app_training_signups_unique_registration;

create unique index if not exists app_training_signups_unique_session_registration_idx
on public.app_training_signups (coalesce(training_session_id, training_id), lower(email));

-- Update the session-aware signup RPC so reactivation/upsert uses session-level uniqueness.
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
    and lower(email) = lower(v_email)
  for update;

  v_had_existing := found;

  if v_had_existing and v_existing.status not in ('cancelled', 'declined') then
    return v_existing;
  end if;

  v_registered_count := public.app_training_session_registered_count(v_session.id);
  if coalesce(v_session.capacity, v_parent.capacity, 0) > 0 and v_registered_count >= coalesce(v_session.capacity, v_parent.capacity, 0) then
    v_status := case when coalesce(v_session.waitlist_enabled, v_parent.waitlist_enabled, true) then 'waitlisted'::training_signup_status else 'declined'::training_signup_status end;
  end if;

  if v_had_existing then
    update public.app_training_signups
    set volunteer_user_id = v_user_id,
        volunteer_name = coalesce(nullif(p_volunteer_name, ''), 'Volunteer'),
        title = v_parent.title,
        session_title = coalesce(nullif(v_session.session_title, ''), v_session.title, v_parent.title),
        session_date = coalesce(v_session.session_date, v_parent.session_date),
        time = coalesce(nullif(v_session.time, ''), nullif(v_parent.time, ''), ''),
        location = coalesce(nullif(v_session.location, ''), nullif(v_parent.location, ''), ''),
        trainer = coalesce(nullif(v_session.trainer, ''), nullif(v_parent.trainer, '')),
        status = v_status,
        signed_up_at = v_now,
        cancelled_at = null,
        completed_at = null,
        completed_session_at = null,
        reviewed_by_email = null,
        reviewed_at = null,
        admin_notes = null,
        updated_at = v_now
    where id = v_existing.id
    returning * into v_saved;
  else
    insert into public.app_training_signups (
      id, training_id, training_session_id, volunteer_user_id, email, volunteer_name,
      title, session_title, session_date, time, location, trainer, status,
      signed_up_at, cancelled_at, completed_at, completed_session_at,
      reviewed_by_email, reviewed_at, admin_notes, updated_at
    ) values (
      coalesce(p_signup_id, gen_random_uuid()), p_training_id, v_session.id, v_user_id, v_email,
      coalesce(nullif(p_volunteer_name, ''), 'Volunteer'), v_parent.title,
      coalesce(nullif(v_session.session_title, ''), v_session.title, v_parent.title),
      coalesce(v_session.session_date, v_parent.session_date),
      coalesce(nullif(v_session.time, ''), nullif(v_parent.time, ''), ''),
      coalesce(nullif(v_session.location, ''), nullif(v_parent.location, ''), ''),
      coalesce(nullif(v_session.trainer, ''), nullif(v_parent.trainer, '')),
      v_status, v_now, null, null, null, null, null, null, v_now
    ) returning * into v_saved;
  end if;

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
