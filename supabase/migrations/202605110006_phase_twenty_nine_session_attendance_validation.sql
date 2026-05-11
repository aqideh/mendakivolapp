-- Phase 29 - Session-Aware Attendance Validation
-- Validate facilitator codes against opportunity sessions first, with controlled opportunity-level fallback.

create extension if not exists pgcrypto;

alter table public.app_opportunity_sessions
  add column if not exists facilitator_code text;

create or replace function public.validate_session_attendance_code(
  p_opportunity_id text,
  p_session_id uuid default null,
  p_code text default null,
  p_allow_opportunity_fallback boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := trim(coalesce(p_code, ''));
  v_session record;
  v_opportunity_valid boolean := false;
begin
  if v_code !~ '^\d{4}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_format');
  end if;

  if p_session_id is not null then
    select id, opportunity_id, facilitator_code
      into v_session
    from public.app_opportunity_sessions
    where id = p_session_id
    limit 1;

    if v_session.id is null then
      return jsonb_build_object('ok', false, 'reason', 'missing_session');
    end if;

    if p_opportunity_id is not null and trim(p_opportunity_id) <> '' and v_session.opportunity_id::text <> p_opportunity_id::text then
      return jsonb_build_object('ok', false, 'reason', 'session_opportunity_mismatch');
    end if;

    if nullif(trim(coalesce(v_session.facilitator_code, '')), '') is not null then
      if trim(v_session.facilitator_code) = v_code then
        return jsonb_build_object('ok', true, 'scope', 'session', 'session_id', v_session.id);
      end if;
      return jsonb_build_object('ok', false, 'reason', 'invalid_session_code', 'scope', 'session', 'session_id', v_session.id);
    end if;

    if not p_allow_opportunity_fallback then
      return jsonb_build_object('ok', false, 'reason', 'session_code_missing', 'scope', 'session', 'session_id', v_session.id);
    end if;
  end if;

  if p_allow_opportunity_fallback and p_opportunity_id is not null and trim(p_opportunity_id) <> '' then
    begin
      select public.validate_attendance_code(p_opportunity_id::text, v_code) into v_opportunity_valid;
    exception when undefined_function then
      v_opportunity_valid := false;
    end;

    if v_opportunity_valid then
      return jsonb_build_object('ok', true, 'scope', 'opportunity_fallback');
    end if;
  end if;

  if p_session_id is not null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code_with_fallback_checked', 'scope', 'session');
  end if;

  return jsonb_build_object('ok', false, 'reason', 'invalid_opportunity_code', 'scope', 'opportunity');
end;
$$;

create or replace function public.get_admin_session_code_warnings()
returns table (
  session_id uuid,
  opportunity_id text,
  session_title text,
  starts_at timestamptz,
  status text,
  has_session_code boolean,
  warning text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id,
         s.opportunity_id::text,
         s.title,
         s.starts_at,
         s.status::text,
         nullif(trim(coalesce(s.facilitator_code, '')), '') is not null as has_session_code,
         case
           when nullif(trim(coalesce(s.facilitator_code, '')), '') is null then 'Session has no facilitator code; attendance may fall back to the opportunity-level code if allowed.'
           else ''
         end as warning
  from public.app_opportunity_sessions s
  where public.current_app_user_is_admin()
    and lower(coalesce(s.status::text, 'open')) <> 'closed'
  order by s.starts_at asc nulls last, s.created_at desc;
$$;

grant execute on function public.validate_session_attendance_code(text, uuid, text, boolean) to authenticated;
grant execute on function public.get_admin_session_code_warnings() to authenticated;
