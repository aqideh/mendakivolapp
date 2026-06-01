# Phase 21 — Session management UI

This phase adds admin-facing opportunity session management on top of the Phase 19 `app_opportunity_sessions` table.

## Implemented

### Admin dashboard session manager

Added `assets/session-management.js` and `assets/session-management.css`.

The session manager appears in the signed-in dashboard for admin/super-admin users and supports:

- list opportunity sessions;
- create a session;
- edit a session;
- delete a session;
- set session-specific:
  - opportunity;
  - title;
  - start time;
  - end time;
  - default hours;
  - capacity;
  - waitlist setting;
  - facilitator code;
  - location;
  - status;
- manually promote the next waitlisted volunteer for a session using `promote_next_opportunity_waitlist`.

### Supabase integration

The UI writes directly to `public.app_opportunity_sessions` through the existing Supabase client.

It uses the existing admin RLS policy from Phase 19:

- anyone can read sessions;
- admins and super-admins can manage sessions.

When available, it calls `log_content_edit(...)` so session create/update/delete actions are visible in audit logs.

### Loading

`index.html` now loads:

```html
<link rel="stylesheet" href="assets/session-management.css">
<script src="assets/session-management.js" defer></script>
```

## Migration dependency

No new SQL migration is required for this phase.

Required prior SQL:

```sql
-- already required from previous phases
phase-eighteen-audit-logging.sql
phase-eighteen-completion.sql
phase-nineteen-opportunity-sessions.sql
phase-twenty-waitlist-promotion.sql
```

## Manual QA checklist

1. Sign in as an admin or super-admin.
2. Open Dashboard.
3. Confirm the “Opportunity sessions” card appears.
4. Create a session for an existing opportunity.
5. Confirm a row appears in `app_opportunity_sessions`.
6. Edit capacity, time, location, or facilitator code.
7. Confirm the changes persist after page refresh.
8. Delete a test session and confirm it disappears.
9. Create a waitlisted volunteer for a full session.
10. Click “Promote waitlist” and confirm the earliest waitlisted volunteer is promoted.
11. Confirm `app_audit_logs` contains `content_edited` rows for session changes where Phase 18 audit RPCs are installed.
12. Confirm non-admin users do not see the session manager.

## Deliberate limitation

This phase adds admin session CRUD and manual waitlist promotion. It does not yet implement volunteer-facing multi-session selection in the opportunity sign-up modal.

That should be handled as a follow-up slice:

- show sessions inside the opportunity modal;
- let volunteers select one session before signing up;
- call `create_opportunity_session_signup_with_capacity(...)` with the selected `session_id`;
- show session-specific timing/location in dashboard and attendance views.
