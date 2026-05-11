-- Phase 24 - Referral / Invite Friends
-- Apply this migration in Supabase before enabling production referral tracking.

create extension if not exists pgcrypto;

create table if not exists public.app_referral_codes (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_referral_codes_user_unique unique (app_user_id),
  constraint app_referral_codes_code_format check (code ~ '^[A-Z0-9-]{6,32}$')
);

create table if not exists public.app_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.app_users(id) on delete cascade,
  referred_user_id uuid not null references public.app_users(id) on delete cascade,
  referred_email text,
  referral_code text not null,
  status text not null default 'accepted',
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint app_referrals_no_self_referral check (referrer_user_id <> referred_user_id),
  constraint app_referrals_referred_user_unique unique (referred_user_id),
  constraint app_referrals_status_check check (status in ('accepted', 'converted', 'cancelled', 'duplicate'))
);

create index if not exists app_referral_codes_code_idx on public.app_referral_codes (code);
create index if not exists app_referrals_referrer_idx on public.app_referrals (referrer_user_id, accepted_at desc);
create index if not exists app_referrals_referred_idx on public.app_referrals (referred_user_id);

alter table public.app_referral_codes enable row level security;
alter table public.app_referrals enable row level security;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.app_users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_app_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users
    where auth_user_id = auth.uid()
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.make_referral_code(p_seed text)
returns text
language plpgsql
volatile
as $$
declare
  base text;
  candidate text;
  attempts integer := 0;
begin
  base := upper(regexp_replace(coalesce(p_seed, 'VOL'), '[^A-Za-z0-9]+', '', 'g'));
  if length(base) < 3 then
    base := 'VOL';
  end if;
  base := left(base, 8);

  loop
    candidate := base || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.app_referral_codes where code = candidate);
    attempts := attempts + 1;
    if attempts > 10 then
      candidate := 'VOL-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
      exit;
    end if;
  end loop;

  return candidate;
end;
$$;

create or replace function public.ensure_my_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.app_users%rowtype;
  v_code text;
begin
  select * into v_user from public.app_users where auth_user_id = auth.uid() limit 1;
  if v_user.id is null then
    raise exception 'No app user found for current auth session.';
  end if;

  select code into v_code from public.app_referral_codes where app_user_id = v_user.id limit 1;
  if v_code is not null then
    return v_code;
  end if;

  v_code := public.make_referral_code(coalesce(v_user.full_name, split_part(v_user.email, '@', 1), 'VOL'));
  insert into public.app_referral_codes (app_user_id, code)
  values (v_user.id, v_code)
  on conflict (app_user_id) do update set updated_at = now()
  returning code into v_code;

  return v_code;
end;
$$;

create or replace function public.accept_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_referred public.app_users%rowtype;
  v_referrer_id uuid;
  v_existing public.app_referrals%rowtype;
begin
  if v_code = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_code');
  end if;

  select * into v_referred from public.app_users where auth_user_id = auth.uid() limit 1;
  if v_referred.id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_app_user');
  end if;

  select app_user_id into v_referrer_id from public.app_referral_codes where code = v_code limit 1;
  if v_referrer_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  if v_referrer_id = v_referred.id then
    return jsonb_build_object('ok', false, 'reason', 'self_referral');
  end if;

  select * into v_existing from public.app_referrals where referred_user_id = v_referred.id limit 1;
  if v_existing.id is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_referred', 'referral_id', v_existing.id);
  end if;

  insert into public.app_referrals (referrer_user_id, referred_user_id, referred_email, referral_code, status, metadata)
  values (v_referrer_id, v_referred.id, v_referred.email, v_code, 'accepted', jsonb_build_object('accepted_from', 'volunteer_hub'))
  returning * into v_existing;

  return jsonb_build_object('ok', true, 'referral_id', v_existing.id, 'status', v_existing.status);
end;
$$;

create or replace function public.get_my_referrals()
returns table (
  id uuid,
  referred_email text,
  referred_name text,
  status text,
  accepted_at timestamptz,
  referral_code text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id,
         coalesce(r.referred_email, u.email) as referred_email,
         u.full_name as referred_name,
         r.status,
         r.accepted_at,
         r.referral_code
  from public.app_referrals r
  left join public.app_users u on u.id = r.referred_user_id
  where r.referrer_user_id = public.current_app_user_id()
  order by r.accepted_at desc;
$$;

create or replace function public.get_admin_referrals()
returns table (
  id uuid,
  referrer_email text,
  referrer_name text,
  referred_email text,
  referred_name text,
  status text,
  accepted_at timestamptz,
  referral_code text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id,
         referrer.email as referrer_email,
         referrer.full_name as referrer_name,
         coalesce(r.referred_email, referred.email) as referred_email,
         referred.full_name as referred_name,
         r.status,
         r.accepted_at,
         r.referral_code
  from public.app_referrals r
  left join public.app_users referrer on referrer.id = r.referrer_user_id
  left join public.app_users referred on referred.id = r.referred_user_id
  where public.current_app_user_is_admin()
  order by r.accepted_at desc;
$$;

drop policy if exists "Users can read own referral code" on public.app_referral_codes;
create policy "Users can read own referral code"
  on public.app_referral_codes for select
  using (app_user_id = public.current_app_user_id() or public.current_app_user_is_admin());

drop policy if exists "Users can read own referrals" on public.app_referrals;
create policy "Users can read own referrals"
  on public.app_referrals for select
  using (
    referrer_user_id = public.current_app_user_id()
    or referred_user_id = public.current_app_user_id()
    or public.current_app_user_is_admin()
  );

grant execute on function public.ensure_my_referral_code() to authenticated;
grant execute on function public.accept_referral_code(text) to authenticated;
grant execute on function public.get_my_referrals() to authenticated;
grant execute on function public.get_admin_referrals() to authenticated;
