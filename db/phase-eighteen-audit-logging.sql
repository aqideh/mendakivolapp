-- Phase 18C: Audit logging and admin accountability
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
-- 11. db/phase-seventeen-training-lifecycle.sql

create extension if not exists pgcrypto;

create table if not exists public.app_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  actor_role text,
  action text not null,
  entity_table text not null,
  entity_id text,
  target_user_email text,
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_audit_logs_created_at
on public.app_audit_logs(created_at desc);

create index if not exists idx_app_audit_logs_action_created
on public.app_audit_logs(action, created_at desc);

create index if not exists idx_app_audit_logs_entity
on public.app_audit_logs(entity_table, entity_id, created_at desc);

create index if not exists idx_app_audit_logs_actor
on public.app_audit_logs(actor_email, created_at desc);

create index if not exists idx_app_audit_logs_target
on public.app_audit_logs(target_user_email, created_at desc);

alter table public.app_audit_logs enable row level security;

drop policy if exists "Admins can read audit logs" on public.app_audit_logs;
create policy "Admins can read audit logs"
on public.app_audit_logs
for select
using (public.current_app_role() in ('admin', 'super_admin'));

-- Audit logs should be written by trusted server-side functions only.
-- Direct client inserts are intentionally not granted.
create or replace function public.log_app_audit_event(
  p_action text,
  p_entity_table text,
  p_entity_id text default null,
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
declare
  v_id uuid;
  v_actor_user_id uuid;
  v_actor_role text;
begin
  if nullif(trim(coalesce(p_action, '')), '') is null then
    raise exception 'Audit action is required';
  end if;

  if nullif(trim(coalesce(p_entity_table, '')), '') is null then
    raise exception 'Audit entity table is required';
  end if;

  v_actor_user_id := public.current_app_user_id();
  v_actor_role := public.current_app_role()::text;

  insert into public.app_audit_logs (
    actor_user_id,
    actor_email,
    actor_role,
    action,
    entity_table,
    entity_id,
    target_user_email,
    previous_state,
    new_state,
    metadata
  ) values (
    v_actor_user_id,
    auth.email(),
    v_actor_role,
    p_action,
    p_entity_table,
    p_entity_id,
    p_target_user_email,
    p_previous_state,
    p_new_state,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_app_audit_event(text, text, text, text, jsonb, jsonb, jsonb) from public;
revoke all on function public.log_app_audit_event(text, text, text, text, jsonb, jsonb, jsonb) from authenticated;

-- Recreate opportunity sign-up creation RPC with audit logging.
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

  select * into v_existing
  from public.app_opportunity_signups
  where opportunity_id = p_opportunity_id
    and email = v_email
  for update;

  v_had_existing := found;

  if v_had_existing and v_existing.status not in ('cancelled', 'declined') then
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

  perform public.log_app_audit_event(
    case when v_had_existing then 'opportunity_signup_reactivated' else 'opportunity_signup_created' end,
    'app_opportunity_signups',
    v_saved.id::text,
    v_saved.email,
    case when v_had_existing then to_jsonb(v_existing) else null end,
    to_jsonb(v_saved),
    jsonb_build_object(
      'opportunity_id', v_saved.opportunity_id,
      'opportunity_title', v_saved.title,
      'status', v_saved.status,
      'capacity', v_opp.capacity,
      'waitlist_enabled', v_opp.waitlist_enabled,
      'confirmed_count_before', v_confirmed_count
    )
  );

  return v_saved;
end;
$$;

revoke all on function public.create_opportunity_signup_with_capacity(uuid, text, text) from public;
grant execute on function public.create_opportunity_signup_with_capacity(uuid, text, text) to authenticated;

-- Recreate opportunity sign-up review RPC with audit logging.
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

  v_previous := v_signup;

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
      'opportunity_title', v_signup.title,
      'capacity', v_opp.capacity,
      'waitlist_enabled', v_opp.waitlist_enabled,
      'confirmed_count_before_review', v_confirmed_count,
      'capacity_adjusted', p_status <> v_final_status
    )
  );

  return v_signup;
end;
$$;

revoke all on function public.review_opportunity_signup_with_capacity(uuid, signup_status, text) from public;
grant execute on function public.review_opportunity_signup_with_capacity(uuid, signup_status, text) to authenticated;

-- Add an audited cancellation RPC so volunteer cancellations can stop using direct table updates.
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
      'opportunity_title', v_signup.title,
      'previous_status', v_previous.status,
      'reason_present', nullif(p_cancellation_reason, '') is not null
    )
  );

  return v_signup;
end;
$$;

revoke all on function public.cancel_opportunity_signup(uuid, text) from public;
grant execute on function public.cancel_opportunity_signup(uuid, text) to authenticated;

-- Recreate attendance code validation with failed-attempt auditing.
create or replace function public.validate_attendance_code(
  p_opportunity_id text,
  p_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valid boolean;
begin
  select exists (
    select 1
    from public.app_attendance_codes c
    where c.opportunity_id = p_opportunity_id
      and c.code = p_code
      and c.active = true
  ) into v_valid;

  if not v_valid then
    perform public.log_app_audit_event(
      'attendance_code_validation_failed',
      'app_attendance_codes',
      p_opportunity_id,
      auth.email(),
      null,
      null,
      jsonb_build_object(
        'opportunity_id', p_opportunity_id,
        'code_format_valid', coalesce(p_code, '') ~ '^\d{4}$'
      )
    );
  end if;

  return v_valid;
end;
$$;

revoke all on function public.validate_attendance_code(text, text) from public;
grant execute on function public.validate_attendance_code(text, text) to authenticated;

-- Recreate attendance-code management with audit logging.
create or replace function public.upsert_attendance_code(
  p_opportunity_id text,
  p_code text,
  p_label text default 'Facilitator code'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_previous_active jsonb;
  v_new_active jsonb;
begin
  if public.current_app_role() not in ('admin', 'super_admin') then
    raise exception 'Only admins can manage attendance codes';
  end if;

  if p_code !~ '^\d{4}$' then
    raise exception 'Attendance code must be 4 digits';
  end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.updated_at desc), '[]'::jsonb)
  into v_previous_active
  from public.app_attendance_codes c
  where c.opportunity_id = p_opportunity_id
    and c.active = true;

  update public.app_attendance_codes
  set active = false,
      updated_at = now()
  where opportunity_id = p_opportunity_id
    and active = true
    and code <> p_code;

  insert into public.app_attendance_codes (
    opportunity_id,
    code,
    label,
    active,
    created_by_email,
    updated_at
  )
  values (
    p_opportunity_id,
    p_code,
    coalesce(nullif(p_label, ''), 'Facilitator code'),
    true,
    auth.email(),
    now()
  )
  on conflict (opportunity_id, code) do update
  set label = excluded.label,
      active = true,
      updated_at = now()
  returning id into v_id;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.updated_at desc), '[]'::jsonb)
  into v_new_active
  from public.app_attendance_codes c
  where c.opportunity_id = p_opportunity_id
    and c.active = true;

  perform public.log_app_audit_event(
    'attendance_code_upserted',
    'app_attendance_codes',
    v_id::text,
    null,
    v_previous_active,
    v_new_active,
    jsonb_build_object(
      'opportunity_id', p_opportunity_id,
      'label', coalesce(nullif(p_label, ''), 'Facilitator code')
    )
  );

  return v_id;
end;
$$;

revoke all on function public.upsert_attendance_code(text, text, text) from public;
grant execute on function public.upsert_attendance_code(text, text, text) to authenticated;
