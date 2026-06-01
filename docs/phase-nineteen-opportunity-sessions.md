# Phase 19 — Proper opportunity session model

This phase introduces true opportunity sessions while preserving the current opportunity-level user experience.

## Implemented

### Database

Added `public.app_opportunity_sessions` with:

- `id`
- `opportunity_id`
- `title`
- `starts_at`
- `ends_at`
- `default_hours`
- `capacity`
- `waitlist_enabled`
- `facilitator_code`
- `location`
- `status`
- `source`
- timestamps

Added nullable `session_id` links to:

- `app_opportunity_signups`
- `app_attendance_claims`

Existing opportunities receive one default backfilled session. Existing sign-ups and attendance claims are linked to that default session where possible.

### RPCs

Added:

- `app_default_opportunity_session_id(p_opportunity_id)`
- `app_session_confirmed_count(p_session_id)`
- `create_opportunity_session_signup_with_capacity(...)`

Recreated existing wrappers so current frontend calls still work:

- `create_opportunity_signup_with_capacity(...)`
- `review_opportunity_signup_with_capacity(...)`

The existing opportunity sign-up RPC now delegates to the default session. This keeps the current UI working while making capacity enforcement session-aware.

### Frontend

Added `assets/phase-nineteen-sessions.js`.

It:

- fetches `app_opportunity_sessions` from Supabase;
- stores sessions in `window.__mendakiOpportunitySessions`;
- exposes `window.MENDAKIOpportunitySessions` helpers;
- overlays default session details onto existing opportunity cards;
- patches cached signups/attendance claims with `sessionId` when possible.

Loaded from `index.html` after `phase-eight-supabase.js`.

## Migration order

Run this after Phase 18 migrations:

```sql
\i db/phase-eighteen-audit-logging.sql
\i db/phase-eighteen-completion.sql
\i db/phase-nineteen-opportunity-sessions.sql
```

In Supabase SQL Editor, copy/paste the contents of each file in that order because `\i` is usually a local `psql` command, not a dashboard command.

## Manual QA checklist

1. Run the Phase 19 migration after Phase 18.
2. Verify sessions were backfilled:

```sql
select opportunity_id, count(*)
from public.app_opportunity_sessions
group by opportunity_id
order by opportunity_id;
```

3. Verify sign-ups have session links where possible:

```sql
select count(*) filter (where session_id is null) as missing_session_id,
       count(*) as total
from public.app_opportunity_signups;
```

4. Sign in as a volunteer and sign up for an opportunity.
5. Confirm `app_opportunity_signups.session_id` is populated.
6. Confirm capacity enforcement is based on the session capacity.
7. Check in and check out for a confirmed opportunity.
8. Confirm `app_attendance_claims.session_id` is populated for existing/backfilled records where possible.
9. Sign in as admin and confirm/review a sign-up.
10. Confirm audit metadata includes `session_id`.

## Current limitations

This phase creates the session model and bridges default sessions into the existing app. It does not yet provide full multi-session selection UI for volunteers or full admin CRUD for sessions.

Those should be added in a follow-up admin UX/session management slice:

- session selector in the opportunity modal;
- admin create/edit/delete session UI;
- session-level attendance-code management UI;
- reports filtered by session;
- waitlist promotion per session.
