-- Phase 25 - Gamification Backend
-- Server-side points ledger, achievements, and award RPCs.

create extension if not exists pgcrypto;

create table if not exists public.app_points_ledger (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  points integer not null,
  reason text not null,
  source_type text not null,
  source_id uuid,
  awarded_by uuid references public.app_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint app_points_ledger_points_nonzero check (points <> 0),
  constraint app_points_ledger_reason_check check (reason in ('attendance_verified', 'training_completed', 'referral_accepted', 'admin_adjustment'))
);

create unique index if not exists app_points_once_per_source_idx
  on public.app_points_ledger (app_user_id, reason, source_type, source_id)
  where source_id is not null and reason <> 'admin_adjustment';

create index if not exists app_points_ledger_user_created_idx on public.app_points_ledger (app_user_id, created_at desc);
create index if not exists app_points_ledger_reason_idx on public.app_points_ledger (reason, created_at desc);

create table if not exists public.app_achievements (
  id text primary key,
  title text not null,
  description text not null,
  points_required integer not null default 0,
  badge_label text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_user_achievements (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  achievement_id text not null references public.app_achievements(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint app_user_achievements_unique unique (app_user_id, achievement_id)
);

alter table public.app_points_ledger enable row level security;
alter table public.app_achievements enable row level security;
alter table public.app_user_achievements enable row level security;

insert into public.app_achievements (id, title, description, points_required, badge_label, sort_order)
values
  ('first_points', 'First Points', 'Earn your first volunteer points.', 1, 'Started', 10),
  ('twenty_points', 'Momentum Builder', 'Earn at least 20 points.', 20, '20 pts', 20),
  ('fifty_points', 'Community Contributor', 'Earn at least 50 points.', 50, '50 pts', 30),
  ('hundred_points', 'Volunteer Champion', 'Earn at least 100 points.', 100, '100 pts', 40)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  points_required = excluded.points_required,
  badge_label = excluded.badge_label,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();

create or replace function public.resolve_app_user_id(p_email text default null, p_app_user_id uuid default null)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if p_app_user_id is not null then
    return p_app_user_id;
  end if;

  if p_email is not null and trim(p_email) <> '' then
    select id into v_user_id
    from public.app_users
    where lower(email) = lower(trim(p_email))
    limit 1;
    if v_user_id is not null then
      return v_user_id;
    end if;
  end if;

  return null;
end;
$$;

create or replace function public.award_points_once(
  p_app_user_id uuid,
  p_points integer,
  p_reason text,
  p_source_type text,
  p_source_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_id uuid;
  v_actor uuid;
begin
  if p_app_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_user');
  end if;
  if coalesce(p_points, 0) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'missing_points');
  end if;

  v_actor := public.current_app_user_id();

  insert into public.app_points_ledger (app_user_id, points, reason, source_type, source_id, awarded_by, metadata)
  values (p_app_user_id, p_points, p_reason, p_source_type, p_source_id, v_actor, coalesce(p_metadata, '{}'::jsonb))
  on conflict do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    return jsonb_build_object('ok', false, 'reason', 'duplicate');
  end if;

  perform public.refresh_user_achievements(p_app_user_id);
  return jsonb_build_object('ok', true, 'ledger_id', v_inserted_id);
end;
$$;

create or replace function public.user_total_points(p_app_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(points), 0)::integer
  from public.app_points_ledger
  where app_user_id = p_app_user_id;
$$;

create or replace function public.refresh_user_achievements(p_app_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_count integer := 0;
begin
  if p_app_user_id is null then
    return 0;
  end if;

  v_total := public.user_total_points(p_app_user_id);

  insert into public.app_user_achievements (app_user_id, achievement_id, metadata)
  select p_app_user_id,
         a.id,
         jsonb_build_object('points_total', v_total)
  from public.app_achievements a
  where a.active = true
    and v_total >= a.points_required
  on conflict (app_user_id, achievement_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.award_verified_attendance_points(p_claim_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim record;
  v_user_id uuid;
  v_hours numeric;
  v_points integer;
begin
  select * into v_claim
  from public.app_attendance_claims
  where id = p_claim_id
  limit 1;

  if v_claim.id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_claim');
  end if;

  if coalesce(v_claim.claim_status, '') not in ('verified', 'adjusted') then
    return jsonb_build_object('ok', false, 'reason', 'claim_not_verified');
  end if;

  v_user_id := public.resolve_app_user_id(v_claim.email, null);
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_user');
  end if;

  v_hours := greatest(coalesce(v_claim.verified_hours, 0), 0);
  v_points := greatest(ceil(v_hours)::integer * 5, 5);

  return public.award_points_once(
    v_user_id,
    v_points,
    'attendance_verified',
    'app_attendance_claims',
    p_claim_id,
    jsonb_build_object('verified_hours', v_hours, 'title', coalesce(v_claim.title, ''))
  );
end;
$$;

create or replace function public.award_training_completion_points(p_training_signup_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signup record;
  v_user_id uuid;
begin
  select * into v_signup
  from public.app_training_signups
  where id = p_training_signup_id
  limit 1;

  if v_signup.id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_training_signup');
  end if;

  if coalesce(v_signup.status, '') <> 'completed' then
    return jsonb_build_object('ok', false, 'reason', 'training_not_completed');
  end if;

  v_user_id := public.resolve_app_user_id(v_signup.email, v_signup.volunteer_user_id);
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_user');
  end if;

  return public.award_points_once(
    v_user_id,
    10,
    'training_completed',
    'app_training_signups',
    p_training_signup_id,
    jsonb_build_object('title', coalesce(v_signup.title, ''))
  );
end;
$$;

create or replace function public.award_referral_points(p_referral_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral record;
begin
  select * into v_referral
  from public.app_referrals
  where id = p_referral_id
  limit 1;

  if v_referral.id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_referral');
  end if;

  if coalesce(v_referral.status, '') not in ('accepted', 'converted') then
    return jsonb_build_object('ok', false, 'reason', 'referral_not_accepted');
  end if;

  return public.award_points_once(
    v_referral.referrer_user_id,
    15,
    'referral_accepted',
    'app_referrals',
    p_referral_id,
    jsonb_build_object('referred_user_id', v_referral.referred_user_id, 'referral_code', v_referral.referral_code)
  );
end;
$$;

create or replace function public.award_available_points()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim record;
  v_training record;
  v_referral record;
  v_attempted integer := 0;
  v_awarded integer := 0;
  v_result jsonb;
begin
  for v_claim in
    select id from public.app_attendance_claims where claim_status in ('verified', 'adjusted')
  loop
    v_attempted := v_attempted + 1;
    v_result := public.award_verified_attendance_points(v_claim.id);
    if coalesce((v_result->>'ok')::boolean, false) then v_awarded := v_awarded + 1; end if;
  end loop;

  for v_training in
    select id from public.app_training_signups where status = 'completed'
  loop
    v_attempted := v_attempted + 1;
    v_result := public.award_training_completion_points(v_training.id);
    if coalesce((v_result->>'ok')::boolean, false) then v_awarded := v_awarded + 1; end if;
  end loop;

  if to_regclass('public.app_referrals') is not null then
    for v_referral in
      select id from public.app_referrals where status in ('accepted', 'converted')
    loop
      v_attempted := v_attempted + 1;
      v_result := public.award_referral_points(v_referral.id);
      if coalesce((v_result->>'ok')::boolean, false) then v_awarded := v_awarded + 1; end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'attempted', v_attempted, 'awarded', v_awarded);
end;
$$;

create or replace function public.get_my_points_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select public.current_app_user_id() as app_user_id
  ), totals as (
    select coalesce(sum(points), 0)::integer as total_points
    from public.app_points_ledger l, me
    where l.app_user_id = me.app_user_id
  ), recent as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'points', points,
      'reason', reason,
      'source_type', source_type,
      'created_at', created_at,
      'metadata', metadata
    ) order by created_at desc), '[]'::jsonb) as items
    from (
      select * from public.app_points_ledger l, me
      where l.app_user_id = me.app_user_id
      order by created_at desc
      limit 10
    ) l
  ), achievements as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'description', a.description,
      'badge_label', a.badge_label,
      'awarded_at', ua.awarded_at
    ) order by a.sort_order), '[]'::jsonb) as items
    from public.app_user_achievements ua
    join public.app_achievements a on a.id = ua.achievement_id
    join me on me.app_user_id = ua.app_user_id
  ), next_achievement as (
    select to_jsonb(a.*) as item
    from public.app_achievements a, totals
    where a.active = true
      and a.points_required > totals.total_points
    order by a.points_required asc, a.sort_order asc
    limit 1
  )
  select jsonb_build_object(
    'total_points', totals.total_points,
    'recent_ledger', recent.items,
    'achievements', achievements.items,
    'next_achievement', coalesce((select item from next_achievement), 'null'::jsonb)
  )
  from totals, recent, achievements;
$$;

create or replace function public.get_admin_points_summary()
returns table (
  app_user_id uuid,
  email text,
  full_name text,
  total_points integer,
  achievement_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id,
         u.email,
         u.full_name,
         coalesce(sum(l.points), 0)::integer as total_points,
         count(distinct ua.achievement_id)::integer as achievement_count
  from public.app_users u
  left join public.app_points_ledger l on l.app_user_id = u.id
  left join public.app_user_achievements ua on ua.app_user_id = u.id
  where public.current_app_user_is_admin()
  group by u.id, u.email, u.full_name
  order by total_points desc, u.full_name asc nulls last, u.email asc
  limit 200;
$$;

drop policy if exists "Users can read own points ledger" on public.app_points_ledger;
create policy "Users can read own points ledger"
  on public.app_points_ledger for select
  using (app_user_id = public.current_app_user_id() or public.current_app_user_is_admin());

drop policy if exists "Users can read active achievements" on public.app_achievements;
create policy "Users can read active achievements"
  on public.app_achievements for select
  using (active = true or public.current_app_user_is_admin());

drop policy if exists "Users can read own awarded achievements" on public.app_user_achievements;
create policy "Users can read own awarded achievements"
  on public.app_user_achievements for select
  using (app_user_id = public.current_app_user_id() or public.current_app_user_is_admin());

grant execute on function public.award_available_points() to authenticated;
grant execute on function public.award_verified_attendance_points(uuid) to authenticated;
grant execute on function public.award_training_completion_points(uuid) to authenticated;
grant execute on function public.award_referral_points(uuid) to authenticated;
grant execute on function public.get_my_points_summary() to authenticated;
grant execute on function public.get_admin_points_summary() to authenticated;
