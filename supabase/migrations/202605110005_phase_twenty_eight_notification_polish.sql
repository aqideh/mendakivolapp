-- Phase 28 - Notification Polish
-- Preferences, history, grouping metadata, and helper notification RPCs.
-- This migration tolerates an existing public.app_notifications table by adding
-- the canonical columns required by the Phase 28 notification layer.

create extension if not exists pgcrypto;

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid()
);

alter table public.app_notifications
  add column if not exists recipient_email text,
  add column if not exists recipient_role text,
  add column if not exists title text,
  add column if not exists message text,
  add column if not exists notification_type text,
  add column if not exists related_table text,
  add column if not exists related_id text,
  add column if not exists is_read boolean,
  add column if not exists read_at timestamptz,
  add column if not exists cleared_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists group_key text,
  add column if not exists action_url text,
  add column if not exists metadata jsonb;

alter table public.app_notifications
  alter column recipient_role set default 'volunteer',
  alter column title set default 'Notification',
  alter column message set default '',
  alter column notification_type set default 'general',
  alter column is_read set default false,
  alter column created_at set default now(),
  alter column metadata set default '{}'::jsonb;

update public.app_notifications
set recipient_role = coalesce(nullif(recipient_role, ''), 'volunteer')
where recipient_role is null or recipient_role = '';

update public.app_notifications
set title = coalesce(nullif(title, ''), 'Notification')
where title is null or title = '';

update public.app_notifications
set message = coalesce(message, '')
where message is null;

update public.app_notifications
set notification_type = coalesce(nullif(notification_type, ''), 'general')
where notification_type is null or notification_type = '';

update public.app_notifications
set is_read = false
where is_read is null;

update public.app_notifications
set created_at = now()
where created_at is null;

update public.app_notifications
set metadata = '{}'::jsonb
where metadata is null;

alter table public.app_notifications
  alter column recipient_role set not null,
  alter column title set not null,
  alter column notification_type set not null,
  alter column is_read set not null,
  alter column created_at set not null,
  alter column metadata set not null;

create index if not exists app_notifications_recipient_created_idx on public.app_notifications (recipient_email, created_at desc);
create index if not exists app_notifications_role_created_idx on public.app_notifications (recipient_role, created_at desc);
create index if not exists app_notifications_unread_idx on public.app_notifications (recipient_email, is_read, cleared_at, created_at desc);
create index if not exists app_notifications_group_idx on public.app_notifications (recipient_email, group_key, cleared_at);

alter table public.app_notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.app_notifications;
create policy "Users can read own notifications"
  on public.app_notifications for select
  using (
    lower(recipient_email) = lower((select email from public.app_users where auth_user_id = auth.uid() limit 1))
    or (recipient_role = 'admin' and public.current_app_user_is_admin())
    or public.current_app_user_is_admin()
  );

drop policy if exists "Users can update own notifications" on public.app_notifications;
create policy "Users can update own notifications"
  on public.app_notifications for update
  using (
    lower(recipient_email) = lower((select email from public.app_users where auth_user_id = auth.uid() limit 1))
    or (recipient_role = 'admin' and public.current_app_user_is_admin())
    or public.current_app_user_is_admin()
  )
  with check (
    lower(recipient_email) = lower((select email from public.app_users where auth_user_id = auth.uid() limit 1))
    or (recipient_role = 'admin' and public.current_app_user_is_admin())
    or public.current_app_user_is_admin()
  );

create table if not exists public.app_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  category text not null,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_notification_preferences_unique unique (app_user_id, category)
);

alter table public.app_notification_preferences enable row level security;

drop policy if exists "Users can manage own notification preferences" on public.app_notification_preferences;
create policy "Users can manage own notification preferences"
  on public.app_notification_preferences for all
  using (app_user_id = public.current_app_user_id() or public.current_app_user_is_admin())
  with check (app_user_id = public.current_app_user_id() or public.current_app_user_is_admin());

create or replace function public.notification_category_for_type(p_type text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_type, '') like 'opportunity_%' then 'opportunities'
    when coalesce(p_type, '') like 'attendance_%' then 'attendance'
    when coalesce(p_type, '') like 'training_%' then 'training'
    when coalesce(p_type, '') like 'referral_%' then 'referrals'
    when coalesce(p_type, '') like 'points_%' or coalesce(p_type, '') like 'achievement_%' then 'points'
    when coalesce(p_type, '') like 'admin_%' then 'admin'
    else 'general'
  end;
$$;

create or replace function public.get_my_notification_preferences()
returns table (
  category text,
  in_app_enabled boolean,
  email_enabled boolean
)
language sql
security definer
set search_path = public
as $$
  with categories(category) as (
    values ('general'), ('opportunities'), ('attendance'), ('training'), ('referrals'), ('points'), ('admin')
  ), me as (
    select public.current_app_user_id() as app_user_id
  ), seeded as (
    insert into public.app_notification_preferences (app_user_id, category)
    select me.app_user_id, categories.category
    from me, categories
    where me.app_user_id is not null
    on conflict (app_user_id, category) do nothing
    returning category
  )
  select c.category,
         coalesce(p.in_app_enabled, true) as in_app_enabled,
         coalesce(p.email_enabled, false) as email_enabled
  from categories c
  cross join me
  left join public.app_notification_preferences p
    on p.app_user_id = me.app_user_id and p.category = c.category
  order by c.category;
$$;

create or replace function public.set_my_notification_preference(
  p_category text,
  p_in_app_enabled boolean,
  p_email_enabled boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_category text := lower(trim(coalesce(p_category, '')));
begin
  v_user_id := public.current_app_user_id();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_user');
  end if;

  if v_category not in ('general', 'opportunities', 'attendance', 'training', 'referrals', 'points', 'admin') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_category');
  end if;

  insert into public.app_notification_preferences (app_user_id, category, in_app_enabled, email_enabled, updated_at)
  values (v_user_id, v_category, coalesce(p_in_app_enabled, true), coalesce(p_email_enabled, false), now())
  on conflict (app_user_id, category) do update set
    in_app_enabled = excluded.in_app_enabled,
    email_enabled = excluded.email_enabled,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.notification_in_app_enabled(p_email text, p_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select p.in_app_enabled
    from public.app_notification_preferences p
    join public.app_users u on u.id = p.app_user_id
    where lower(u.email) = lower(p_email)
      and p.category = public.notification_category_for_type(p_type)
    limit 1
  ), true);
$$;

create or replace function public.create_app_notification(
  p_recipient_email text,
  p_recipient_role text,
  p_title text,
  p_message text default '',
  p_notification_type text default 'general',
  p_related_table text default null,
  p_related_id text default null,
  p_group_key text default null,
  p_action_url text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_existing uuid;
  v_group_key text := nullif(trim(coalesce(p_group_key, '')), '');
begin
  if nullif(trim(coalesce(p_title, '')), '') is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_title');
  end if;

  if nullif(trim(coalesce(p_recipient_email, '')), '') is not null
     and not public.notification_in_app_enabled(p_recipient_email, p_notification_type) then
    return jsonb_build_object('ok', false, 'reason', 'preference_disabled');
  end if;

  if v_group_key is not null then
    select id into v_existing
    from public.app_notifications
    where coalesce(lower(recipient_email), '') = coalesce(lower(p_recipient_email), '')
      and group_key = v_group_key
      and cleared_at is null
    order by created_at desc
    limit 1;

    if v_existing is not null then
      update public.app_notifications
      set title = p_title,
          message = coalesce(p_message, ''),
          notification_type = coalesce(p_notification_type, 'general'),
          related_table = p_related_table,
          related_id = p_related_id,
          action_url = p_action_url,
          metadata = coalesce(p_metadata, '{}'::jsonb),
          is_read = false,
          read_at = null,
          created_at = now()
      where id = v_existing
      returning id into v_id;
      return jsonb_build_object('ok', true, 'id', v_id, 'grouped', true);
    end if;
  end if;

  insert into public.app_notifications (
    recipient_email,
    recipient_role,
    title,
    message,
    notification_type,
    related_table,
    related_id,
    group_key,
    action_url,
    metadata
  ) values (
    nullif(trim(coalesce(p_recipient_email, '')), ''),
    coalesce(nullif(trim(coalesce(p_recipient_role, '')), ''), 'volunteer'),
    p_title,
    coalesce(p_message, ''),
    coalesce(p_notification_type, 'general'),
    p_related_table,
    p_related_id,
    v_group_key,
    p_action_url,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'grouped', false);
end;
$$;

create or replace function public.get_my_notification_history(p_limit integer default 100, p_include_cleared boolean default true)
returns table (
  id uuid,
  recipient_email text,
  recipient_role text,
  title text,
  message text,
  notification_type text,
  related_table text,
  related_id text,
  group_key text,
  action_url text,
  metadata jsonb,
  is_read boolean,
  read_at timestamptz,
  cleared_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id,
         n.recipient_email,
         n.recipient_role,
         n.title,
         n.message,
         n.notification_type,
         n.related_table,
         n.related_id,
         n.group_key,
         n.action_url,
         n.metadata,
         n.is_read,
         n.read_at,
         n.cleared_at,
         n.created_at
  from public.app_notifications n
  where (
      lower(n.recipient_email) = lower((select email from public.app_users where auth_user_id = auth.uid() limit 1))
      or (n.recipient_role = 'admin' and public.current_app_user_is_admin())
    )
    and (p_include_cleared or n.cleared_at is null)
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

create or replace function public.mark_my_notifications_read(p_notification_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.app_notifications n
  set is_read = true,
      read_at = coalesce(read_at, now())
  where (p_notification_ids is null or n.id = any(p_notification_ids))
    and (
      lower(n.recipient_email) = lower((select email from public.app_users where auth_user_id = auth.uid() limit 1))
      or (n.recipient_role = 'admin' and public.current_app_user_is_admin())
    )
    and n.cleared_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.clear_my_notifications(p_notification_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.app_notifications n
  set is_read = true,
      read_at = coalesce(read_at, now()),
      cleared_at = coalesce(cleared_at, now())
  where (p_notification_ids is null or n.id = any(p_notification_ids))
    and (
      lower(n.recipient_email) = lower((select email from public.app_users where auth_user_id = auth.uid() limit 1))
      or (n.recipient_role = 'admin' and public.current_app_user_is_admin())
    )
    and n.cleared_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.get_my_notification_preferences() to authenticated;
grant execute on function public.set_my_notification_preference(text, boolean, boolean) to authenticated;
grant execute on function public.create_app_notification(text, text, text, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.get_my_notification_history(integer, boolean) to authenticated;
grant execute on function public.mark_my_notifications_read(uuid[]) to authenticated;
grant execute on function public.clear_my_notifications(uuid[]) to authenticated;
