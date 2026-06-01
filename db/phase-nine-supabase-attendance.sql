-- Phase 9: Supabase-backed attendance check-in/check-out and admin verification
-- Run this after:
-- 1. db/phase-one-schema.sql
-- 2. db/phase-eight-supabase-signups.sql

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type attendance_status as enum (
      'pending_submission',
      'checked_in',
      'submitted',
      'clarification_requested',
      'verified',
      'adjusted',
      'rejected',
      'no_show'
    );
  end if;
end $$;

create table if not exists public.app_attendance_claims (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid references public.app_opportunity_signups(id) on delete set null,
  opportunity_id text not null,
  email text not null,
  volunteer_name text not null default 'Volunteer',
  title text not null default '',
  claim_status attendance_status not null default 'pending_submission',
  check_in_at timestamptz,
  check_in_code text,
  check_out_at timestamptz,
  check_out_code text,
  claimed_status text,
  claimed_start timestamptz,
  claimed_end timestamptz,
  claimed_hours numeric(5,2) not null default 0,
  verified_hours numeric(5,2) not null default 0,
  submitted_at timestamptz,
  reviewed_by_email text,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_attendance_claims_unique_signup unique (signup_id)
);

create index if not exists idx_app_attendance_claims_email
on public.app_attendance_claims(email);

create index if not exists idx_app_attendance_claims_status
on public.app_attendance_claims(claim_status);

create index if not exists idx_app_attendance_claims_signup_id
on public.app_attendance_claims(signup_id);

alter table public.app_attendance_claims enable row level security;

drop policy if exists "Users can read relevant attendance claims" on public.app_attendance_claims;
create policy "Users can read relevant attendance claims"
on public.app_attendance_claims
for select
using (
  auth.email() = email
  or public.current_app_role() in ('admin', 'super_admin')
);

drop policy if exists "Users can create own attendance claims" on public.app_attendance_claims;
create policy "Users can create own attendance claims"
on public.app_attendance_claims
for insert
with check (auth.email() = email);

drop policy if exists "Users can update relevant attendance claims" on public.app_attendance_claims;
create policy "Users can update relevant attendance claims"
on public.app_attendance_claims
for update
using (
  public.current_app_role() in ('admin', 'super_admin')
  or (auth.email() = email and claim_status in ('pending_submission', 'checked_in', 'clarification_requested', 'rejected'))
)
with check (
  public.current_app_role() in ('admin', 'super_admin')
  or (auth.email() = email and claim_status in ('checked_in', 'submitted'))
);
