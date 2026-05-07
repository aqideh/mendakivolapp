-- Phase 1 volunteer management foundation schema
-- Target: Supabase/PostgreSQL
-- Roles: volunteer, admin, super_admin. No facilitator role.

create extension if not exists pgcrypto;

create type app_role as enum ('volunteer', 'admin', 'super_admin');
create type opportunity_status as enum ('draft', 'open', 'full', 'closed', 'cancelled');
create type signup_status as enum ('registered', 'waitlisted', 'cancelled', 'completed');
create type attendance_claim_status as enum ('pending_submission', 'submitted', 'clarification_requested', 'verified', 'adjusted', 'rejected', 'no_show');
create type testimonial_status as enum ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'completed');

create table app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique not null,
  full_name text not null,
  role app_role not null default 'volunteer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table volunteer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references app_users(id) on delete cascade,
  preferred_name text,
  phone text,
  preferred_volunteer_type text,
  availability_notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  requirements text,
  category text,
  commitment_type text,
  location text,
  capacity integer not null default 0,
  default_hours numeric(5,2) not null default 0,
  status opportunity_status not null default 'draft',
  created_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table opportunity_sessions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location_override text,
  capacity_override integer,
  status opportunity_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_sessions_time_check check (ends_at > starts_at)
);

create table opportunity_signups (
  id uuid primary key default gen_random_uuid(),
  opportunity_session_id uuid not null references opportunity_sessions(id) on delete cascade,
  volunteer_user_id uuid not null references app_users(id) on delete cascade,
  status signup_status not null default 'registered',
  signed_up_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancellation_reason text,
  unique (opportunity_session_id, volunteer_user_id)
);

create table attendance_claims (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid not null unique references opportunity_signups(id) on delete cascade,
  volunteer_user_id uuid not null references app_users(id) on delete cascade,
  claim_status attendance_claim_status not null default 'pending_submission',
  claimed_start_at timestamptz,
  claimed_end_at timestamptz,
  claimed_hours numeric(5,2),
  volunteer_notes text,
  verified_hours numeric(5,2),
  admin_notes text,
  reviewed_by uuid references app_users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_claims_time_check check (
    claimed_start_at is null or claimed_end_at is null or claimed_end_at > claimed_start_at
  )
);

create table trainings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  trainer_name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  capacity integer not null default 0,
  status opportunity_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainings_time_check check (ends_at > starts_at)
);

create table training_signups (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references trainings(id) on delete cascade,
  volunteer_user_id uuid not null references app_users(id) on delete cascade,
  status signup_status not null default 'registered',
  completed_at timestamptz,
  signed_up_at timestamptz not null default now(),
  unique (training_id, volunteer_user_id)
);

create table testimonial_requests (
  id uuid primary key default gen_random_uuid(),
  volunteer_user_id uuid not null references app_users(id) on delete cascade,
  purpose text not null,
  requested_period_start date,
  requested_period_end date,
  volunteer_notes text,
  status testimonial_status not null default 'submitted',
  admin_notes text,
  reviewed_by uuid references app_users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create view volunteer_verified_hour_totals as
select
  volunteer_user_id,
  coalesce(sum(verified_hours), 0)::numeric(8,2) as verified_hours,
  count(*) filter (where claim_status in ('verified', 'adjusted')) as completed_attendances
from attendance_claims
group by volunteer_user_id;

create index idx_opportunity_sessions_starts_at on opportunity_sessions(starts_at);
create index idx_opportunity_signups_volunteer on opportunity_signups(volunteer_user_id);
create index idx_attendance_claims_status on attendance_claims(claim_status);
create index idx_trainings_starts_at on trainings(starts_at);
create index idx_testimonial_requests_status on testimonial_requests(status);

-- Suggested Supabase RLS direction:
-- 1. Volunteers can select their own app_users, volunteer_profiles, signups, attendance_claims, training_signups, and testimonial_requests.
-- 2. Volunteers can insert/update their own profiles, signups, attendance claims, and testimonial requests within workflow constraints.
-- 3. Admins and super_admins can manage all rows.
-- 4. Only admins and super_admins can set verified_hours, reviewed_by, reviewed_at, and admin_notes.
