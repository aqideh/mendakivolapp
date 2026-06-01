# Phase 18C — Audit logging and admin accountability

This phase introduces server-side audit logging for high-impact authoritative actions. The goal is to record committed lifecycle changes in Supabase instead of relying on frontend-only logging.

## Implemented

### Audit table

Added `public.app_audit_logs` with:

- `actor_user_id`
- `actor_email`
- `actor_role`
- `action`
- `entity_table`
- `entity_id`
- `target_user_email`
- `previous_state`
- `new_state`
- `metadata`
- `created_at`

Admins and super-admins can read audit logs. Direct client inserts are not granted. Audit writes are intended to happen through trusted server-side functions.

### Audit helper

Added `public.log_app_audit_event(...)`, a `security definer` helper used by mutation RPCs.

### Opportunity sign-up audit coverage

Recreated `public.create_opportunity_signup_with_capacity(...)` so it logs:

- `opportunity_signup_created`
- `opportunity_signup_reactivated`

The audit metadata includes opportunity ID, opportunity title, final status, capacity, waitlist setting, and confirmed count before insertion.

Recreated `public.review_opportunity_signup_with_capacity(...)` so it logs:

- `opportunity_signup_reviewed`

The audit metadata includes requested status, final status, opportunity ID, opportunity title, capacity, waitlist setting, confirmed count before review, and whether the requested admin decision was capacity-adjusted.

### Cancellation audit support

Added `public.cancel_opportunity_signup(...)`, which logs:

- `opportunity_signup_cancelled_by_volunteer`
- `opportunity_signup_cancelled_by_admin`

This RPC is ready for frontend adoption. The current app cancellation path still needs to be switched from direct table update to this RPC in a follow-up patch.

### Attendance code audit coverage

Recreated `public.validate_attendance_code(...)` so failed attempts log:

- `attendance_code_validation_failed`

The audit metadata does not store the submitted code. It only records opportunity ID and whether the submitted value matched the expected 4-digit format.

Recreated `public.upsert_attendance_code(...)` so code management logs:

- `attendance_code_upserted`

## Migration file

Run:

```sql
\i db/phase-eighteen-audit-logging.sql
```

Run it after Phase 17 migrations, as documented at the top of the SQL file.

## Manual verification queries

Confirm the table exists:

```sql
select to_regclass('public.app_audit_logs');
```

Confirm recent audit entries:

```sql
select action, entity_table, entity_id, actor_email, target_user_email, created_at
from public.app_audit_logs
order by created_at desc
limit 20;
```

Confirm failed attendance-code attempts are logged without storing the code:

```sql
select action, metadata
from public.app_audit_logs
where action = 'attendance_code_validation_failed'
order by created_at desc
limit 10;
```

## Manual QA checklist

1. Run `db/phase-eighteen-audit-logging.sql` in Supabase.
2. Sign in as a volunteer and create an opportunity sign-up.
3. Confirm an `opportunity_signup_created` audit row exists.
4. Cancel and reactivate a previously cancelled sign-up through direct RPC testing; confirm cancellation/reactivation logs exist.
5. Sign in as admin and review a sign-up.
6. Confirm an `opportunity_signup_reviewed` audit row contains both previous and new states.
7. Enter an invalid facilitator attendance code.
8. Confirm an `attendance_code_validation_failed` audit row exists and does not store the submitted code.
9. As a non-admin volunteer, confirm audit logs cannot be selected directly.
10. As an admin, confirm audit logs are readable.

## Follow-up work

The next patches should extend or wire audit coverage for:

1. Frontend cancellation path to call `cancel_opportunity_signup`.
2. Training registration and training lifecycle review.
3. Attendance check-in/check-out and transactional admin review.
4. Content edits.
5. Notification creation and clearing.
6. Admin-visible audit history UI.

The most important immediate follow-up is wiring cancellation to `cancel_opportunity_signup`, because the audited RPC now exists but the current app cancellation path still uses a direct update helper.
