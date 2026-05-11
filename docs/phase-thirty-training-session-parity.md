# Phase 30 — Training Session Parity

Status: implemented as a compatibility-safe backend and frontend layer after Phase 29.5.

## Purpose

Phase 30 gives training the same session-aware foundation as opportunities while preserving the current visible training cards and existing admin lifecycle flow.

The previous training model treated each `app_training_sessions` row as the training itself. Phase 30 keeps that table as the visible catalog for compatibility, then adds parent/session fields so future rows can represent either:

- a parent training listing; or
- a dated session instance under a parent training.

## Files added

```text
supabase/migrations/202605110008_phase_thirty_training_session_parity.sql
supabase/migrations/202605110009_phase_thirty_training_session_unique_constraint_fix.sql
assets/phase-thirty-training-session-parity.js
docs/phase-thirty-training-session-parity.md
```

`index.html` now loads:

```text
assets/phase-thirty-training-session-parity.js
```

after the existing Phase 10 training sync module.

## Database changes

### Training session fields

`app_training_sessions` now supports parent/session structure:

```text
parent_training_id
session_title
starts_at
ends_at
default_hours
is_session_instance
```

Existing training rows are backfilled so each row can act as its own default session until true child sessions are added.

### Training signup session fields

`app_training_signups` now includes:

```text
training_session_id
session_title
completed_session_at
```

Existing signups are backfilled with `training_session_id = training_id`.

### Session-level uniqueness

The old uniqueness rule:

```text
(training_id, email)
```

was removed because it prevents one volunteer from joining multiple sessions under the same parent training.

It is replaced with a session-level unique index:

```text
coalesce(training_session_id, training_id), lower(email)
```

This allows multiple sessions under one parent training while still preventing duplicate registration for the same session.

### New helper/RPC functions

Added:

```sql
public.app_default_training_session_id(p_training_id text)
public.app_training_session_registered_count(p_training_session_id text)
public.create_training_session_signup_with_capacity(
  p_signup_id uuid,
  p_training_id text,
  p_training_session_id text default null,
  p_volunteer_name text default 'Volunteer'
)
```

Updated:

```sql
public.create_training_signup_with_capacity(...)
public.cancel_training_signup(...)
public.review_training_signup_lifecycle(...)
public.award_training_completion_points(...)
```

The legacy `create_training_signup_with_capacity(...)` now delegates to the session-aware RPC using the default training session.

## Frontend changes

`assets/phase-thirty-training-session-parity.js`:

- loads the expanded training session fields from Supabase;
- groups session rows by `parent_training_id`;
- keeps existing parent training cards visible;
- injects a session selector into training cards;
- intercepts training signup clicks when sessions are available;
- calls `create_training_session_signup_with_capacity(...)` with explicit `training_session_id`;
- preserves `trainingSessionId`, `sessionTitle`, and `completedSessionAt` when training signups refresh.

## Current behavior

For current data, each existing training row acts as its own default session. This means current cards should continue to work without requiring immediate data reshaping.

For future true multi-date training:

1. Keep/create a parent training row.
2. Add child rows in `app_training_sessions` with:
   - `parent_training_id = <parent training id>`;
   - `is_session_instance = true`;
   - session-specific date/time/location/capacity.
3. The frontend will group those child rows under the parent training card and show them in the session selector.

## Smoke checks

Before continuing into Phase 31, test:

- Training page still renders existing training cards.
- Existing single-session training signup still works.
- Training signup rows now store `training_session_id`.
- One volunteer cannot duplicate-register for the same training session.
- One volunteer can register for separate session instances under the same parent training.
- Session-specific capacity/waitlist behavior works.
- Admin training lifecycle review still works.
- Completed training still awards points once.
- Training completion point metadata includes `training_id` and `training_session_id`.

## Known limitations

- Admin UI for creating/editing child training session rows is not yet a polished dedicated workflow. That fits Phase 31 Admin UX Refinement.
- Training attendance is represented through lifecycle completion, not a separate check-in/check-out attendance flow.
- Full automated regression coverage is still Phase 32.
- Production security review remains Phase 33.
