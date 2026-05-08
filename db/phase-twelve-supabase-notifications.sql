-- Phase 12: Supabase-backed notifications
-- Run this after:
-- 1. db/phase-one-schema.sql
-- 2. db/phase-eight-supabase-signups.sql
-- 3. db/phase-nine-supabase-attendance.sql
-- 4. db/phase-ten-supabase-training.sql
-- 5. db/phase-eleven-supabase-content.sql

create extension if not exists pgcrypto;

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  recipient_role text not null default 'volunteer',
  title text not null,
  message text not null default '',
  notification_type text not null default 'general',
  related_table text,
  related_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  cleared_at timestamptz
);

alter table public.app_notifications
add column if not exists cleared_at timestamptz;

create index if not exists idx_app_notifications_recipient_email
on public.app_notifications(recipient_email);

create index if not exists idx_app_notifications_role
on public.app_notifications(recipient_role);

create index if not exists idx_app_notifications_unread
on public.app_notifications(recipient_email, is_read, created_at desc);

create index if not exists idx_app_notifications_cleared
on public.app_notifications(recipient_email, cleared_at, created_at desc);

alter table public.app_notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.app_notifications;
create policy "Users can read own notifications"
on public.app_notifications
for select
using (
  cleared_at is null
  and (
    auth.email() = recipient_email
    or (recipient_role in ('admin', 'super_admin') and public.current_app_role() in ('admin', 'super_admin'))
  )
);

drop policy if exists "Users can update own notification read state" on public.app_notifications;
create policy "Users can update own notification read state"
on public.app_notifications
for update
using (
  auth.email() = recipient_email
  or (recipient_role in ('admin', 'super_admin') and public.current_app_role() in ('admin', 'super_admin'))
)
with check (
  auth.email() = recipient_email
  or (recipient_role in ('admin', 'super_admin') and public.current_app_role() in ('admin', 'super_admin'))
);

drop policy if exists "Authenticated users can create lifecycle notifications" on public.app_notifications;
create policy "Authenticated users can create lifecycle notifications"
on public.app_notifications
for insert
with check (auth.role() = 'authenticated');
