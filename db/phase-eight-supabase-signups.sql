-- Phase 8: Supabase-backed opportunities and opportunity sign-ups
-- Run this after db/phase-one-schema.sql.
-- This migration keeps the existing CMS-managed public listings intact while adding
-- Supabase tables for shared opportunity records and sign-up lifecycle state.

create extension if not exists pgcrypto;

create or replace function public.current_app_role()
returns app_role
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.app_users
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_app_user_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id
  from public.app_users
  where auth_user_id = auth.uid()
  limit 1;
$$;

create table if not exists public.app_opportunities (
  id text primary key,
  type text not null default 'ad-hoc',
  category text not null default 'community-volunteering',
  title text not null,
  description text not null default '',
  requirements text not null default '',
  time text not null default '',
  location text not null default '',
  commitment text not null default '',
  status text not null default 'Open',
  photo text,
  photo_alt text,
  source text not null default 'cms',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_opportunity_signups (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text not null,
  volunteer_user_id uuid references public.app_users(id) on delete set null,
  email text not null,
  volunteer_name text not null default 'Volunteer',
  title text not null default '',
  type text not null default '',
  category text not null default '',
  time text not null default '',
  location text not null default '',
  commitment text not null default '',
  hours numeric(5,2) not null default 0,
  status signup_status not null default 'pending_review',
  signed_up_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_email text,
  admin_notes text,
  confirmed_at timestamptz,
  waitlisted_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  verified_hours numeric(5,2) not null default 0,
  updated_at timestamptz not null default now(),
  constraint app_opportunity_signups_unique_active unique (opportunity_id, email)
);

create index if not exists idx_app_opportunity_signups_email
on public.app_opportunity_signups(email);

create index if not exists idx_app_opportunity_signups_status
on public.app_opportunity_signups(status);

create index if not exists idx_app_opportunity_signups_opportunity_id
on public.app_opportunity_signups(opportunity_id);

alter table public.app_opportunities enable row level security;
alter table public.app_opportunity_signups enable row level security;

-- Public users can read active opportunity records. This keeps the public listing usable.
drop policy if exists "Anyone can read app opportunities" on public.app_opportunities;
create policy "Anyone can read app opportunities"
on public.app_opportunities
for select
using (true);

-- Only admins can create or edit the shared opportunity table from the app.
drop policy if exists "Admins can manage app opportunities" on public.app_opportunities;
create policy "Admins can manage app opportunities"
on public.app_opportunities
for all
using (public.current_app_role() in ('admin', 'super_admin'))
with check (public.current_app_role() in ('admin', 'super_admin'));

-- Volunteers can see their own sign-ups. Admins can see all sign-ups.
drop policy if exists "Users can read relevant app signups" on public.app_opportunity_signups;
create policy "Users can read relevant app signups"
on public.app_opportunity_signups
for select
using (
  auth.email() = email
  or public.current_app_role() in ('admin', 'super_admin')
);

-- Volunteers can create their own sign-up rows.
drop policy if exists "Users can create own app signups" on public.app_opportunity_signups;
create policy "Users can create own app signups"
on public.app_opportunity_signups
for insert
with check (
  auth.email() = email
  and coalesce(volunteer_user_id, public.current_app_user_id()) = public.current_app_user_id()
);

-- Volunteers can cancel/update their own rows while they are not completed.
-- Admins can manage all rows for review decisions.
drop policy if exists "Users can update relevant app signups" on public.app_opportunity_signups;
create policy "Users can update relevant app signups"
on public.app_opportunity_signups
for update
using (
  public.current_app_role() in ('admin', 'super_admin')
  or (auth.email() = email and status <> 'completed')
)
with check (
  public.current_app_role() in ('admin', 'super_admin')
  or (auth.email() = email and status in ('pending_review', 'cancelled'))
);

-- Optional seed: copy current CMS opportunities into Supabase.
-- Re-run safely when IDs are unchanged.
insert into public.app_opportunities (
  id, type, category, title, description, requirements, time, location, commitment, status, source
)
values
  ('0', 'long-term', 'facilitator', 'RSL Maths Explorer', 'Support preschool-aged children and parents in fun, hands-on maths activities that build early numeracy skills. You will work alongside MENDAKI educators to guide families through structured play-based learning sessions.', 'No prior teaching experience needed. Training provided. Comfortable working with young children aged 4-6.', 'Weekends, ~2 hrs/session', 'Various Community Clubs', 'Monthly, ongoing', 'Open', 'seed'),
  ('1', 'long-term', 'mentor', '#amPowered Mentor', 'Mentor a Malay/Muslim youth aged 15-18 to help them discover their strengths, build resilience, and navigate education and career pathways. Mentors meet their mentees at least twice a month.', '18 years and above. Willingness to commit to a 6-month mentoring relationship. Passion for youth development.', 'Monthly, 6-month commitment', 'Schools / Online', '6-month commitment', 'Open', 'seed'),
  ('2', 'long-term', 'befriender', 'Befriender', 'Provide companionship to MENDAKI beneficiaries - seniors, single parents, or individuals facing hardship - through regular visits or calls. Your presence can make a profound difference to someone facing isolation.', 'Empathetic, patient, and a good listener. No specific qualifications required.', 'Flexible, monthly', 'Island-wide', 'Minimum 3 months', 'Open', 'seed'),
  ('3', 'ad-hoc', 'community-volunteering', 'MAP Packing Day', 'Help pack resource materials, stationery, and goodie bags for students enrolled in the MENDAKI Achievement Programme. A fun, social volunteering session that makes a direct impact on students across Singapore.', 'Able-bodied and willing to work in a packing environment. No experience needed.', 'One-time, ~4 hrs', 'Wisma MENDAKI', 'One-time', 'Open', 'seed'),
  ('4', 'ad-hoc', 'community-volunteering', 'RSL Child Minder', 'Provide attentive child-minding support during RSL parent workshops, so that parents can participate fully without worry. You will supervise and engage children with structured activities during the session.', 'Patient and comfortable with young children. Basic first aid knowledge a plus but not required.', 'Per workshop, ~3 hrs', 'Various Community Clubs', 'One-time per session', 'Open', 'seed'),
  ('5', 'ad-hoc', 'community-volunteering', 'Raikan Ilmu Usher', 'Be part of MENDAKI''s flagship Raikan Ilmu awards ceremony - an inspiring celebration of student achievement. As an usher, you will guide guests, manage registration, and help create a memorable event experience.', 'Presentable and well-spoken. Comfortable in a formal event setting. Smart casual or formal attire required.', 'One-time, full day', 'Suntec Convention Centre', 'One-time', '4 left', 'seed')
on conflict (id) do update
set
  type = excluded.type,
  category = excluded.category,
  title = excluded.title,
  description = excluded.description,
  requirements = excluded.requirements,
  time = excluded.time,
  location = excluded.location,
  commitment = excluded.commitment,
  status = excluded.status,
  updated_at = now();
