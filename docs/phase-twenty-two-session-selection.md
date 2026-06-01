# Phase 22 — Volunteer session selection

This phase completes the user-facing side of the opportunity session model.

## Implemented

### Session picker in opportunity modal

Added:

- `assets/session-selection.css`
- `assets/session-selection.js`

When an opportunity has more than one open session, the opportunity modal now shows a “Choose a session” picker with:

- session title;
- start/end date and time;
- session-specific location;
- default hours;
- capacity.

If an opportunity has zero or one open session, the UI does not add extra friction and the existing default-session flow remains active.

### Session-aware signup RPC

When a volunteer selects a session and signs up, the frontend calls:

```sql
create_opportunity_session_signup_with_capacity(
  p_signup_id,
  p_opportunity_id,
  p_session_id,
  p_volunteer_name
)
```

The returned signup is cached with:

- `sessionId`;
- session-specific time label;
- session-specific location;
- session-specific default hours.

### Script order

`index.html` now loads session selection before `phase-eight-supabase.js` so the session-aware handler can intercept selected-session signups before the legacy/default-session authoritative handler.

Relevant order:

```html
<script src="assets/phase-nineteen-sessions.js" defer></script>
<script src="assets/session-selection.js" defer></script>
<script src="assets/phase-eight-supabase.js" defer></script>
```

## Migration dependency

No new SQL is required.

Required prior migration:

```sql
db/phase-nineteen-opportunity-sessions.sql
```

## Manual QA checklist

1. Sign in as admin.
2. Create two open sessions for the same opportunity in the dashboard session manager.
3. Sign in as a volunteer.
4. Open that opportunity.
5. Confirm a session picker appears.
6. Select the second session.
7. Sign up.
8. Confirm `app_opportunity_signups.session_id` equals the selected session.
9. Confirm dashboard sign-up row shows the selected session’s timing/location.
10. Confirm an opportunity with only one session still signs up using the existing default-session path.
11. Confirm capacity/waitlist behaviour is session-specific.

## Current limitations

- Attendance code validation still receives `opportunity_id`. Session-specific facilitator-code validation should be added as a follow-up if different sessions need different codes.
- Existing signups created before Phase 19/22 may still point to the backfilled default session.
