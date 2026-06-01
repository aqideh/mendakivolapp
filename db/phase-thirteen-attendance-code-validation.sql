-- Phase 13: Real attendance-code validation
-- Run this after:
-- 1. db/phase-one-schema.sql
-- 2. db/phase-eight-supabase-signups.sql
-- 3. db/phase-nine-supabase-attendance.sql
-- 4. db/phase-ten-supabase-training.sql
-- 5. db/phase-eleven-supabase-content.sql
-- 6. db/phase-twelve-supabase-notifications.sql

create extension if not exists pgcrypto;

create table if not exists public.app_attendance_codes (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text not null,
  code text not null check (code ~ '^\d{4}$'),
  label text not null default 'Facilitator code',
  active boolean not null default true,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_attendance_codes_unique_active_code unique (opportunity_id, code)
);

create index if not exists idx_app_attendance_codes_opportunity
on public.app_attendance_codes(opportunity_id, active);

alter table public.app_attendance_codes enable row level security;

drop policy if exists "Admins can manage attendance codes" on public.app_attendance_codes;
create policy "Admins can manage attendance codes"
on public.app_attendance_codes
for all
using (public.current_app_role() in ('admin', 'super_admin'))
with check (public.current_app_role() in ('admin', 'super_admin'));

-- Volunteers do not receive direct SELECT access to the code table.
-- They validate a submitted code through this SECURITY DEFINER function.
create or replace function public.validate_attendance_code(
  p_opportunity_id text,
  p_code text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_attendance_codes c
    where c.opportunity_id = p_opportunity_id
      and c.code = p_code
      and c.active = true
  );
$$;

revoke all on function public.validate_attendance_code(text, text) from public;
grant execute on function public.validate_attendance_code(text, text) to authenticated;

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
begin
  if public.current_app_role() not in ('admin', 'super_admin') then
    raise exception 'Only admins can manage attendance codes';
  end if;

  if p_code !~ '^\d{4}$' then
    raise exception 'Attendance code must be 4 digits';
  end if;

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

  return v_id;
end;
$$;

revoke all on function public.upsert_attendance_code(text, text, text) from public;
grant execute on function public.upsert_attendance_code(text, text, text) to authenticated;

-- Demo seed codes for currently seeded opportunity records. Replace per opportunity from the admin dashboard.
insert into public.app_attendance_codes (opportunity_id, code, label, active, created_by_email)
select id, '1234', 'Demo facilitator code', true, 'seed'
from public.app_opportunities
on conflict (opportunity_id, code) do update
set active = true,
    updated_at = now();
