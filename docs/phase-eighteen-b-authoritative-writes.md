# Phase 18B — Authoritative Supabase write path cleanup

> Supersession note: This phase describes earlier prototype behavior and is superseded by the YM Hub/Salesforce product boundary in `docs/product-intent.md`. Opportunity sign-up creation, lifecycle state, capacity, and waitlist authority belong to YM Hub/Salesforce. Supabase opportunity sign-up writes described here are historical prototype behavior unless explicitly reapproved and documented.

This phase starts removing production-risky local-first writes. In Supabase mode, high-impact volunteer lifecycle actions should wait for the database/RPC response before the UI treats the action as successful.

## Implemented in this slice

### Opportunity sign-ups

`assets/phase-eight-supabase.js` now installs a Supabase-mode click interceptor for opportunity sign-up actions:

- volunteer opportunity sign-up
- volunteer cancellation
- admin sign-up review decisions

When Supabase Auth is ready, these actions are handled before the older local-first handlers. The database/RPC result is treated as authoritative, then local cached state is refreshed from Supabase.

Historical note: this Supabase authority model is no longer the product boundary for volunteer opportunity sign-ups. YM Hub/Salesforce is the authoritative production source of truth. Do not restore or extend these writes as production behavior without updating `docs/product-intent.md`, `docs/ai-development-guide.md`, `docs/architecture.md`, and README.

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

Historical QA note: this checklist is retained for prototype regression context only. Current product QA should verify that volunteer opportunity CTAs route to YM Hub/Salesforce and do not create in-app opportunity sign-ups unless the product boundary has been changed.

## Remaining Phase 18B work

The same server-authoritative pattern should still be applied to:

1. Training registrations and training lifecycle review in `assets/phase-ten-training-sync.js`.
2. Attendance check-in/check-out and admin attendance review in `assets/phase-nine-attendance-sync.js`.
3. Content-admin writes in `assets/supabase-content-admin.js` where relevant.

Attendance admin review should be especially strict: if `review_attendance_claim_transactional` is unavailable or fails, production mode should not fall back to a partial direct attendance save. Attendance verification and opportunity completion must be updated transactionally.

## Next recommended implementation slice

Continue Phase 18B by making training registration/review server-authoritative, then make attendance review strictly transactional. Do not use this historical document to justify in-app opportunity sign-up ownership.
