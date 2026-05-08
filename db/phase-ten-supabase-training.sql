-- Phase 10: Supabase-backed training sessions and training sign-ups
-- Run this after:
-- 1. db/phase-one-schema.sql
-- 2. db/phase-eight-supabase-signups.sql
-- 3. db/phase-nine-supabase-attendance.sql

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'training_signup_status') then
    create type training_signup_status as enum (
      'registered',
      'cancelled',
      'completed'
    );
  end if;
end $$;

create table if not exists public.app_training_sessions (
  id text primary key,
  title text not null,
  description text not null default '',
  trainer text,
  session_date date,
  time text not null default '',
  location text not null default '',
  capacity integer not null default 0,
  status text not null default 'Open',
  required_for text[] not null default '{}',
  source text not null default 'cms',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_training_signups (
  id uuid primary key default gen_random_uuid(),
  training_id text not null,
  volunteer_user_id uuid references public.app_users(id) on delete set null,
  email text not null,
  volunteer_name text not null default 'Volunteer',
  title text not null default '',
  session_date date,
  time text not null default '',
  location text not null default '',
  trainer text,
  status training_signup_status not null default 'registered',
  signed_up_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  reviewed_by_email text,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_training_signups_unique_registration unique (training_id, email)
);

create index if not exists idx_app_training_signups_email
on public.app_training_signups(email);

create index if not exists idx_app_training_signups_status
on public.app_training_signups(status);

create index if not exists idx_app_training_signups_training_id
on public.app_training_signups(training_id);

alter table public.app_training_sessions enable row level security;
alter table public.app_training_signups enable row level security;

drop policy if exists "Anyone can read app training sessions" on public.app_training_sessions;
create policy "Anyone can read app training sessions"
on public.app_training_sessions
for select
using (true);

drop policy if exists "Admins can manage app training sessions" on public.app_training_sessions;
create policy "Admins can manage app training sessions"
on public.app_training_sessions
for all
using (public.current_app_role() in ('admin', 'super_admin'))
with check (public.current_app_role() in ('admin', 'super_admin'));

drop policy if exists "Users can read relevant training signups" on public.app_training_signups;
create policy "Users can read relevant training signups"
on public.app_training_signups
for select
using (
  auth.email() = email
  or public.current_app_role() in ('admin', 'super_admin')
);

drop policy if exists "Users can create own training signups" on public.app_training_signups;
create policy "Users can create own training signups"
on public.app_training_signups
for insert
with check (
  auth.email() = email
  and coalesce(volunteer_user_id, public.current_app_user_id()) = public.current_app_user_id()
);

drop policy if exists "Users can update relevant training signups" on public.app_training_signups;
create policy "Users can update relevant training signups"
on public.app_training_signups
for update
using (
  public.current_app_role() in ('admin', 'super_admin')
  or auth.email() = email
)
with check (
  public.current_app_role() in ('admin', 'super_admin')
  or (auth.email() = email and status in ('registered', 'cancelled'))
);

-- Optional seed from the current CMS-managed training list.
insert into public.app_training_sessions (
  id, title, description, trainer, session_date, time, location, capacity, status, required_for, source
)
values
  ('training-orientation', 'Volunteer Orientation', 'A practical introduction to MENDAKI''s volunteer standards, safeguarding expectations, and volunteer journey.', 'Volunteer Management Team', '2026-02-07', '10:00 AM - 12:00 PM', 'Wisma MENDAKI', 30, 'Open', array['mentor', 'facilitator', 'befriender', 'community-volunteering'], 'seed'),
  ('training-youth-mentoring', 'Youth Mentoring Essentials', 'Learn practical mentoring techniques, boundaries, conversation prompts, and escalation pathways for youth-facing roles.', 'Youth Development Team', '2026-02-21', '9:30 AM - 1:00 PM', 'Online', 25, 'Open', array['mentor'], 'seed'),
  ('training-befriending-care', 'Befriending and Care Basics', 'Build confidence in active listening, empathy, safe check-ins, and reporting concerns when supporting beneficiaries.', 'Community Support Team', '2026-03-06', '7:00 PM - 9:00 PM', 'Online', 40, 'Open', array['befriender'], 'seed')
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  trainer = excluded.trainer,
  session_date = excluded.session_date,
  time = excluded.time,
  location = excluded.location,
  capacity = excluded.capacity,
  status = excluded.status,
  required_for = excluded.required_for,
  updated_at = now();
