# Phase 29.5 — Security and Session Contract Hardening

Status: implemented as a focused hardening pass after Phase 29 and before Phase 30.

## Purpose

Phase 29.5 reduces immediate pilot/beta risk before adding Training Session Parity. It focuses on two areas:

1. Supabase RPC execute grants and database-side access posture.
2. Attendance check-in/out session-contract safety.

This phase is intentionally narrower than full production readiness. Broader RLS tuning, index cleanup, Auth redirect review, leaked-password settings, and obsolete file deletion remain Phase 32/33 work.

## Files added

```text
supabase/migrations/202605110007_phase_twenty_nine_five_security_session_hardening.sql
assets/phase-twenty-nine-five-hardening.js
docs/phase-twenty-nine-five-security-session-hardening.md
```

## Database changes

The migration tightens execute grants for sensitive RPCs.

### Anonymous execution removed

The migration revokes `EXECUTE` from `public` and `anon` for sensitive RPC families, including:

- referral RPCs;
- notification preference/history RPCs;
- opportunity/training signup mutation RPCs;
- attendance-code validation and code-management RPCs;
- admin report RPCs;
- audit-log RPCs;
- points and achievement awarding RPCs;
- admin review RPCs;
- waitlist-promotion RPCs.

### Authenticated execution retained where required

The migration grants `EXECUTE` to `authenticated` for required app RPCs because Supabase exposes signed-in app users through the `authenticated` database role. Admin-only RPCs still rely on database-side checks such as `current_app_user_is_admin()` or `current_app_role()` inside the functions.

This means:

- anonymous users should not be able to call sensitive RPCs;
- signed-in volunteers can still use volunteer flows;
- signed-in volunteers may technically have `EXECUTE` on some admin RPCs, but those RPCs must return no rows or raise exceptions because their bodies enforce admin role checks.

### Session attendance validation hardened

`validate_session_attendance_code(...)` now requires `auth.uid()` and returns an `auth_required` failure for anonymous calls. It remains session-first and uses opportunity-level fallback only when explicitly allowed.

### Verification helper added

The migration adds:

```sql
public.get_phase_29_5_rpc_grant_audit()
```

It reports, for the Phase 29.5 target RPC set:

- function name;
- function signature;
- whether `anon` can execute;
- whether `authenticated` can execute.

This helper is intended for future sessions to verify that anonymous execute grants remain closed.

## Frontend changes

`assets/phase-twenty-nine-five-hardening.js` is loaded after `assets/attendance-code-validation.js` and before the older attendance rendering/sync modules.

It installs a capture-phase attendance handler for `[data-attendance-punch]` actions. The handler:

1. resolves the signup from the clicked attendance button;
2. resolves `sessionId` from the signup, existing attendance claim, or default opportunity session;
3. refuses check-in/out if no session can be resolved;
4. calls `VolunteerDataStore.validateAttendanceCode(...)` with explicit `{ signup, sessionId, allowOpportunityFallback: true }`;
5. saves the attendance claim with the resolved `session_id`.

This reduces reliance on cached/inferred validation inside the older handler and prevents attendance rows from being saved without an explicit session context when Supabase is active.

## Minimum smoke checks

Run these before Phase 30:

### Grant checks

```sql
select *
from public.get_phase_29_5_rpc_grant_audit()
where anon_can_execute = true;
```

Expected result: zero rows.

### Anonymous access checks

As an anonymous client, verify these fail or are unavailable:

- `validate_session_attendance_code(...)`;
- `create_opportunity_signup_with_capacity(...)`;
- `review_opportunity_signup_with_capacity(...)`;
- `get_admin_volunteer_hours_report(...)`;
- `get_admin_audit_logs(...)`;
- `award_points_once(...)`;
- `create_app_notification(...)`.

### Volunteer access checks

As a signed-in volunteer:

- can create/cancel own opportunity signup;
- can read/update own notifications/preferences;
- cannot review opportunity signups;
- cannot review attendance claims;
- cannot fetch admin reports/audit logs;
- cannot manage attendance codes.

### Admin access checks

As a signed-in admin:

- can review opportunity signups;
- can review attendance claims;
- can fetch admin reports;
- can fetch audit logs;
- can manage attendance codes;
- can see session code warnings.

### Session attendance checks

Use an opportunity with two sessions and different facilitator codes:

- correct session code is accepted;
- wrong-session code is rejected;
- attendance claim stores the correct `session_id`;
- if a session has no code, opportunity fallback works only where fallback is intentionally allowed.

## Remaining limitations

- Full role-permission automated tests are not yet implemented.
- Direct attendance claim upsert still exists in the frontend, but Phase 29.5 now requires explicit session resolution before that write. A future backend RPC for check-in/check-out would be stronger.
- Some admin RPCs still grant `EXECUTE` to `authenticated` and rely on internal admin checks. This is acceptable for pilot/beta but should be reviewed again in Phase 33.
- Supabase advisor may still report unrelated production-readiness items such as RLS performance initplans, duplicate indexes, leaked-password protection, and legacy table policies.
