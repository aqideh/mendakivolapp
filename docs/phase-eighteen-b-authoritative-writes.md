# Phase 18B — Authoritative Supabase write path cleanup

This phase starts removing production-risky local-first writes. In Supabase mode, high-impact volunteer lifecycle actions should wait for the database/RPC response before the UI treats the action as successful.

## Implemented in this slice

### Opportunity sign-ups

`assets/phase-eight-supabase.js` now installs a Supabase-mode click interceptor for opportunity sign-up actions:

- volunteer opportunity sign-up
- volunteer cancellation
- admin sign-up review decisions

When Supabase Auth is ready, these actions are handled before the older local-first handlers. The database/RPC result is treated as authoritative, then local cached state is refreshed from Supabase.

This avoids the previous production-risk pattern where the UI wrote localStorage first and only later attempted to persist to Supabase.

## Behaviour changes

- Sign-up creation waits for `create_opportunity_signup_with_capacity`.
- The returned status is shown to the user. This can be `pending_review`, `waitlisted`, or `declined`, depending on backend capacity logic.
- Cancellation waits for a Supabase update before refreshing dashboard/list views.
- Admin review waits for `review_opportunity_signup_with_capacity` before refreshing admin and volunteer views.
- If the Supabase write fails, the app shows an error and does not create a successful local fallback state.
- Local/demo mode still uses the older localStorage path.

## Manual QA checklist

1. Sign in with a Supabase volunteer account.
2. Open an opportunity modal and sign up.
3. Confirm the button waits in a saving state, then displays the backend-returned status.
4. Confirm the dashboard sign-up list refreshes from Supabase.
5. Cancel the sign-up and confirm the dashboard refreshes only after the backend update succeeds.
6. Sign in with an admin account.
7. Confirm, waitlist, and decline sign-ups from the admin queue.
8. Confirm capacity rules are enforced by the RPC result, not by optimistic UI state.
9. Temporarily remove or break the capacity RPC in a test database and verify the UI shows an error instead of silently creating a local successful sign-up.
10. Disable Supabase config and confirm local demo sign-up still works.

## Remaining Phase 18B work

The same server-authoritative pattern should still be applied to:

1. Training registrations and training lifecycle review in `assets/phase-ten-training-sync.js`.
2. Attendance check-in/check-out and admin attendance review in `assets/phase-nine-attendance-sync.js`.
3. Content-admin writes in `assets/supabase-content-admin.js` where relevant.

Attendance admin review should be especially strict: if `review_attendance_claim_transactional` is unavailable or fails, production mode should not fall back to a partial direct attendance save. Attendance verification and opportunity completion must be updated transactionally.

## Next recommended implementation slice

Continue Phase 18B by making training registration/review server-authoritative, then make attendance review strictly transactional.
