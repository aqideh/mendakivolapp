-- Phase 41 runtime warning fixes
-- Fixes referral code generation dependency and enum-safe points award checks.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.make_referral_code(p_seed text)
returns text
language plpgsql
set search_path = public, extensions
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
    candidate := base || '-' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.app_referral_codes where code = candidate);
    attempts := attempts + 1;
    if attempts > 10 then
      candidate := 'VOL-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));
      exit;
    end if;
  end loop;

  return candidate;
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

  if coalesce(v_claim.claim_status::text, '') not in ('verified', 'adjusted') then
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
    select id from public.app_attendance_claims where claim_status::text in ('verified', 'adjusted')
  loop
    v_attempted := v_attempted + 1;
    v_result := public.award_verified_attendance_points(v_claim.id);
    if coalesce((v_result->>'ok')::boolean, false) then v_awarded := v_awarded + 1; end if;
  end loop;

  for v_training in
    select id from public.app_training_signups where status::text = 'completed'
  loop
    v_attempted := v_attempted + 1;
    v_result := public.award_training_completion_points(v_training.id);
    if coalesce((v_result->>'ok')::boolean, false) then v_awarded := v_awarded + 1; end if;
  end loop;

  if to_regclass('public.app_referrals') is not null then
    for v_referral in
      select id from public.app_referrals where status::text in ('accepted', 'converted')
    loop
      v_attempted := v_attempted + 1;
      v_result := public.award_referral_points(v_referral.id);
      if coalesce((v_result->>'ok')::boolean, false) then v_awarded := v_awarded + 1; end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'attempted', v_attempted, 'awarded', v_awarded);
end;
$$;
