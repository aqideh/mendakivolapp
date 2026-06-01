-- Phase 27 - Audit History UI
-- Canonical audit-log table and admin-only read RPC.
-- This migration tolerates an existing public.app_audit_logs table by adding
-- the canonical columns required by the Phase 27 viewer.

create extension if not exists pgcrypto;

create table if not exists public.app_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.app_audit_logs
  add column if not exists actor_user_id uuid references public.app_users(id) on delete set null,
  add column if not exists actor_email text,
  add column if not exists action_type text,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists target_user_id uuid references public.app_users(id) on delete set null,
  add column if not exists target_email text,
  add column if not exists summary text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.app_audit_logs
  alter column action_type set default 'unknown_action',
  alter column entity_type set default 'unknown_entity',
  alter column metadata set default '{}'::jsonb;

update public.app_audit_logs
set action_type = coalesce(nullif(action_type, ''), 'legacy_event')
where action_type is null or action_type = '';

update public.app_audit_logs
set entity_type = coalesce(nullif(entity_type, ''), 'legacy_entity')
where entity_type is null or entity_type = '';

update public.app_audit_logs
set metadata = '{}'::jsonb
where metadata is null;

alter table public.app_audit_logs
  alter column action_type set not null,
  alter column entity_type set not null,
  alter column metadata set not null;

create index if not exists app_audit_logs_created_idx on public.app_audit_logs (created_at desc);
create index if not exists app_audit_logs_action_idx on public.app_audit_logs (action_type, created_at desc);
create index if not exists app_audit_logs_entity_idx on public.app_audit_logs (entity_type, entity_id, created_at desc);
create index if not exists app_audit_logs_actor_idx on public.app_audit_logs (actor_email, created_at desc);
create index if not exists app_audit_logs_target_idx on public.app_audit_logs (target_email, created_at desc);

alter table public.app_audit_logs enable row level security;

drop policy if exists "Admins can read audit logs" on public.app_audit_logs;
create policy "Admins can read audit logs"
  on public.app_audit_logs for select
  using (public.current_app_user_is_admin());

create or replace function public.record_app_audit_log(
  p_action_type text,
  p_entity_type text,
  p_entity_id text default null,
  p_target_user_id uuid default null,
  p_target_email text default null,
  p_summary text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_email text;
  v_id uuid;
begin
  select id, email into v_actor_id, v_actor_email
  from public.app_users
  where auth_user_id = auth.uid()
  limit 1;

  insert into public.app_audit_logs (
    actor_user_id,
    actor_email,
    action_type,
    entity_type,
    entity_id,
    target_user_id,
    target_email,
    summary,
    metadata
  ) values (
    v_actor_id,
    v_actor_email,
    coalesce(nullif(trim(p_action_type), ''), 'unknown_action'),
    coalesce(nullif(trim(p_entity_type), ''), 'unknown_entity'),
    nullif(trim(coalesce(p_entity_id, '')), ''),
    p_target_user_id,
    nullif(trim(coalesce(p_target_email, '')), ''),
    nullif(trim(coalesce(p_summary, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.get_admin_audit_logs(
  p_start_date date default null,
  p_end_date date default null,
  p_action_type text default null,
  p_actor text default null,
  p_entity_type text default null,
  p_target text default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  actor_email text,
  action_type text,
  entity_type text,
  entity_id text,
  target_email text,
  summary text,
  metadata jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id,
         l.actor_email,
         l.action_type,
         l.entity_type,
         l.entity_id,
         l.target_email,
         l.summary,
         l.metadata,
         l.created_at
  from public.app_audit_logs l
  where public.current_app_user_is_admin()
    and (p_start_date is null or l.created_at >= p_start_date::timestamptz)
    and (p_end_date is null or l.created_at < (p_end_date + 1)::timestamptz)
    and (p_action_type is null or l.action_type = p_action_type)
    and (p_actor is null or l.actor_email ilike '%' || p_actor || '%')
    and (p_entity_type is null or l.entity_type = p_entity_type)
    and (p_target is null or l.target_email ilike '%' || p_target || '%')
  order by l.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

create or replace function public.get_admin_audit_filter_options()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'action_types', coalesce((select jsonb_agg(action_type order by action_type) from (select distinct action_type from public.app_audit_logs where action_type is not null) a), '[]'::jsonb),
    'entity_types', coalesce((select jsonb_agg(entity_type order by entity_type) from (select distinct entity_type from public.app_audit_logs where entity_type is not null) e), '[]'::jsonb)
  )
  where public.current_app_user_is_admin();
$$;

grant execute on function public.record_app_audit_log(text, text, text, uuid, text, text, jsonb) to authenticated;
grant execute on function public.get_admin_audit_logs(date, date, text, text, text, text, integer) to authenticated;
grant execute on function public.get_admin_audit_filter_options() to authenticated;
