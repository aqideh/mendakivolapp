# Phase 20 — Waitlist promotion automation

This phase adds automatic waitlist promotion after cancellations.

## Implemented

### Opportunity waitlist promotion

Added `public.promote_next_opportunity_waitlist(p_session_id, p_opportunity_id)`.

It:

- locks the relevant session or opportunity context;
- checks confirmed/completed count against capacity;
- selects the earliest waitlisted sign-up;
- promotes that sign-up to `confirmed`;
- creates a volunteer notification;
- writes an audit log event: `opportunity_waitlist_promoted`.

Promotion is session-aware when `session_id` exists. It falls back to opportunity-level behaviour for legacy rows.

### Training waitlist promotion

Added `public.promote_next_training_waitlist(p_training_id)`.

It:

- locks the training session;
- checks registered/completed count against capacity;
- selects the earliest waitlisted training sign-up;
- promotes that sign-up to `registered`;
- creates a volunteer notification;
- writes an audit log event: `training_waitlist_promoted`.

### Cancellation integration

Recreated:

- `public.cancel_opportunity_signup(...)`
- `public.cancel_training_signup(...)`

Both still return the cancelled row for frontend compatibility.

When a confirmed opportunity sign-up is cancelled, `cancel_opportunity_signup` automatically calls `promote_next_opportunity_waitlist` in the same transaction.

When a registered training sign-up is cancelled, `cancel_training_signup` automatically calls `promote_next_training_waitlist` in the same transaction.

The existing frontend cancellation handlers already refresh the full sign-up tables after cancellation, so promoted rows should appear without a manual refresh.

## Migration order

Run after Phase 19:

```sql
\i db/phase-eighteen-audit-logging.sql
\i db/phase-eighteen-completion.sql
\i db/phase-nineteen-opportunity-sessions.sql
\i db/phase-twenty-waitlist-promotion.sql
```

In Supabase SQL Editor, copy and paste each file’s contents in that order. `\i` is normally a local `psql` command.

## Manual QA checklist

### Opportunity waitlist promotion

1. Pick or create an opportunity session with capacity `1` and waitlist enabled.
2. Sign up Volunteer A and confirm them.
3. Sign up Volunteer B so they are waitlisted.
4. Cancel Volunteer A’s confirmed sign-up.
5. Confirm Volunteer B is automatically promoted to `confirmed`.
6. Confirm Volunteer B receives an `opportunity_waitlist_promoted` notification.
7. Confirm `app_audit_logs` has an `opportunity_waitlist_promoted` row.
8. Confirm promotion metadata includes `opportunity_id`, `session_id`, capacity, and prior confirmed count.

### Training waitlist promotion

1. Pick or create a training session with capacity `1` and waitlist enabled.
2. Register Volunteer A.
3. Register Volunteer B so they are waitlisted.
4. Cancel Volunteer A’s registered training sign-up.
5. Confirm Volunteer B is automatically promoted to `registered`.
6. Confirm Volunteer B receives a `training_waitlist_promoted` notification.
7. Confirm `app_audit_logs` has a `training_waitlist_promoted` row.

## Verification queries

Opportunity promotions:

```sql
select id, action, entity_id, target_user_email, metadata, created_at
from public.app_audit_logs
where action = 'opportunity_waitlist_promoted'
order by created_at desc
limit 20;
```

Training promotions:

```sql
select id, action, entity_id, target_user_email, metadata, created_at
from public.app_audit_logs
where action = 'training_waitlist_promoted'
order by created_at desc
limit 20;
```

Recent promotion notifications:

```sql
select recipient_email, notification_type, title, related_table, related_id, created_at
from public.app_notifications
where notification_type in ('opportunity_waitlist_promoted', 'training_waitlist_promoted')
order by created_at desc
limit 20;
```

## Current limitations

- There is no admin manual promotion button yet. Admins can still change status through existing review controls, but manual “promote next” UI belongs in the next admin/session management slice.
- The RPCs currently promote only one waitlisted participant per cancellation. This is intentional because one cancellation normally opens one slot.
- Multi-session volunteer selection UI is not implemented yet. Promotion is session-aware where sign-ups have `session_id`, and opportunity-level otherwise.
