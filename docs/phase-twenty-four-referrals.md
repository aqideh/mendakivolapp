# Phase 24 — Referral / Invite Friends

This phase adds the first Supabase-backed referral system for the MENDAKI Volunteer Hub.

## Implemented

### Referral database layer

Added migration:

- `supabase/migrations/202605110001_phase_twenty_four_referrals.sql`

The migration creates:

- `app_referral_codes`
- `app_referrals`

It also adds RPCs:

- `ensure_my_referral_code()`
- `accept_referral_code(p_code text)`
- `get_my_referrals()`
- `get_admin_referrals()`

RLS is enabled on referral tables. Users can read their own referral code/referrals, and admins can view all referrals through the admin RPC.

### Volunteer referral UI

Added frontend module:

- `assets/referrals.js`

The dashboard now gets a referral card that:

- generates or fetches the signed-in user's referral code;
- displays a shareable referral link;
- supports copy/share actions;
- captures incoming referral links using `?ref=CODE` or `?referral=CODE`;
- saves a pending referral code locally until the user signs in;
- accepts the referral after sign-in by calling `accept_referral_code(...)`;
- shows the volunteer's accepted referrals.

### Admin referral visibility

Admins get a referral tracking dashboard card that lists:

- referrer;
- referred user;
- referral code;
- status;
- accepted date.

### Loader

`assets/admin-attendance-code-view.js` now loads:

- `assets/pre-phase-urgent-fixes.js`
- `assets/referrals.js`

This avoids another full `index.html` rewrite while keeping Phase 24 active through an already-loaded app boot path.

## Supabase setup required

Before QA, apply the migration in Supabase:

```sql
supabase/migrations/202605110001_phase_twenty_four_referrals.sql
```

If the migration is not applied, the frontend will fail safely and log warnings, but referral codes and referral records will not work.

## Manual QA checklist

### Referral code generation

1. Sign in as an existing volunteer.
2. Open Dashboard.
3. Confirm the Referral invite card appears.
4. Confirm a referral code is shown.
5. Confirm a referral link containing `?ref=` is shown.

### Copy/share

1. Click Copy link.
2. Paste into a text field.
3. Confirm the URL includes the referral code.
4. On a browser/device with Web Share support, click Share and confirm the native share sheet opens.

### Referral acceptance

1. Copy Volunteer A's referral link.
2. Open the link in a fresh/incognito browser.
3. Confirm the app preserves the referral code before sign-in.
4. Create/sign in as Volunteer B.
5. Confirm `app_referrals` gets one row with:
   - `referrer_user_id` = Volunteer A's app user ID;
   - `referred_user_id` = Volunteer B's app user ID;
   - `status = accepted`.

### Anti-duplicate and self-referral

1. Open your own referral link while signed in as yourself.
2. Confirm no referral row is created.
3. Try accepting a second referral code after one is already accepted.
4. Confirm no duplicate row is created for the same referred user.

### Admin view

1. Sign in as an admin.
2. Open Dashboard → Admin.
3. Confirm the Referral tracking card appears.
4. Confirm referral rows show referrer, referred user, status, code, and accepted date.

## Current limitations carried into roadmap

Phase 25 now awards points for accepted referrals, so the earlier “referral points are not awarded yet” limitation is resolved by the gamification backend phase once its migration is applied.

Remaining referral limitations to track in the development roadmap:

- Build a public invite landing page instead of routing referral links directly into the dashboard/app flow.
- Add referral notifications after a referral is accepted or converted.
- Add admin status controls for referrals, including conversion/cancellation handling.
- Track abandoned invite visits or pre-signup invite starts if campaign analytics are needed.
- Add clearer anti-abuse rules beyond one referral per referred user, such as email/domain checks or admin review queues if required for production.

## Roadmap impact

- Phase 25 — Gamification Backend should include referral point awards from server-side RPCs.
- Phase 28 — Notification Polish should include referral acceptance/conversion notifications.
- Phase 31 — Admin UX Refinement should include a dedicated referral admin page/status workflow.
- Phase 32 — QA / Smoke Tests should include referral attribution, duplicate prevention, and referral points tests.
- Phase 33 — Production Readiness should include referral link domain/redirect verification and invite abuse review.
