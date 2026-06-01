-- Phase 40 - Referral admin workflow
-- Adds a narrow admin-only RPC for referral status updates with metadata/audit context.

create or replace function public.review_app_referral_status(
  p_referral_id uuid,
  p_status text,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.app_referrals%rowtype;
  v_previous_status text;
  v_actor uuid;
begin
  if not public.current_app_user_is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'admin_required');
  end if;

  if p_status not in ('accepted', 'converted', 'cancelled', 'duplicate') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status');
  end if;

  select public.current_app_user_id() into v_actor;

  select * into v_referral
  from public.app_referrals
  where id = p_referral_id
  for update;

  if v_referral.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_previous_status := v_referral.status;

  update public.app_referrals
  set status = p_status,
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'admin_notes', nullif(trim(coalesce(p_admin_notes, '')), ''),
          'reviewed_by', v_actor,
          'reviewed_at', now(),
          'previous_status', v_previous_status
        ),
      updated_at = now()
  where id = p_referral_id
  returning * into v_referral;

  perform public.record_app_audit_log(
    'referral.status_reviewed',
    'app_referral',
    v_referral.id,
    v_actor,
    v_referral.referred_user_id,
    jsonb_build_object(
      'previous_status', v_previous_status,
      'status', v_referral.status,
      'admin_notes_present', nullif(trim(coalesce(p_admin_notes, '')), '') is not null
    )
  );

  return jsonb_build_object(
    'ok', true,
    'referral_id', v_referral.id,
    'previous_status', v_previous_status,
    'status', v_referral.status
  );
end;
$$;

revoke all on function public.review_app_referral_status(uuid, text, text) from public, anon;
grant execute on function public.review_app_referral_status(uuid, text, text) to authenticated;
