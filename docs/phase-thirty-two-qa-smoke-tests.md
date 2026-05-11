# Phase 32 — QA / Smoke Tests / Hardening

Status: implemented as a repeatable QA baseline after Phase 31.

## Purpose

Phase 32 establishes a regression safety net for the pilot/beta app before production-readiness work. It does not try to fully automate every workflow. It provides:

1. a manual QA checklist;
2. read-only Supabase verification SQL;
3. an admin-only in-app QA smoke-check panel.

## Files added

```text
docs/phase-thirty-two-qa-smoke-tests.md
supabase/verification/phase32_smoke_checks.sql
assets/phase-thirty-two-qa-tools.css
assets/phase-thirty-two-qa-tools.js
```

`index.html` loads the Phase 32 CSS and JS after Phase 31.

## Manual QA checklist

### 1. Auth and profile

- Sign in as a normal volunteer.
- Confirm dashboard appears.
- Update profile name, email, interest, and availability.
- Sign out and sign back in.
- Confirm profile data persists.
- Sign in as an admin.
- Confirm admin workspace appears.
- Confirm non-admin account does not see admin workspace.

### 2. Opportunity session signup

- Open Opportunities.
- Pick an opportunity with more than one session.
- Select a session.
- Sign up.
- Confirm dashboard shows the correct opportunity and session.
- Cancel the signup.
- Confirm the cancelled status is reflected.
- Sign up again.
- Confirm reactivation or new signup works as expected.

### 3. Capacity and waitlist

- Use an opportunity session with a low capacity.
- Register volunteers until capacity is reached.
- Confirm additional signups become waitlisted where waitlist is enabled.
- Confirm signup is declined or blocked where waitlist is disabled.
- Cancel a confirmed signup.
- Confirm waitlist promotion works.

### 4. Session-aware attendance

- Sign up for an opportunity session.
- Set a session facilitator code as admin.
- As volunteer, check in using the correct code.
- Confirm wrong-session code is rejected.
- Confirm invalid code format is rejected.
- Check out using the correct code.
- Confirm attendance claim stores the correct `session_id`.
- As admin, review/verify the claim.
- Confirm verified hours appear in dashboard stats.

### 5. Training session parity

- As admin, open Admin workspace → Training.
- Create a child training session under an existing parent training.
- Edit the child training session.
- As volunteer, open Training.
- Select the child training session.
- Sign up.
- Confirm `training_session_id` is stored.
- Confirm the same volunteer cannot duplicate-register for the same child session.
- Confirm the same volunteer can register for a separate child session under the same parent training.
- As admin, mark a training signup completed.
- Confirm training completion points are awarded only once.

### 6. Referrals

- Sign in as a volunteer and generate/view referral code.
- Open referral link in a clean/private browser session.
- Sign in or register as a different volunteer.
- Confirm pending referral is accepted.
- Confirm self-referral is prevented.
- Confirm duplicate referral is prevented.
- Confirm admin referral card/report reflects the referral.

### 7. Points and achievements

- Verify attendance to award attendance points.
- Complete training to award training points.
- Accept referral to award referral points.
- Re-run relevant award action where possible.
- Confirm points are idempotent and not duplicated.
- Confirm achievements refresh as thresholds are reached.

### 8. Reports and CSV exports

- Open Admin workspace → Reports.
- Run each report type.
- Apply date/status filters.
- Export CSV.
- Confirm CSV opens and includes expected columns.
- Confirm report rows match visible app data for sampled records.

### 9. Audit history

- Perform a content edit, signup review, attendance review, and training review.
- Open Admin workspace → Audit.
- Filter by action/entity/date.
- Open details drawer.
- Export CSV.
- Confirm metadata is understandable and relevant.

### 10. Notifications

- Trigger signup/training/points/referral notifications.
- Confirm notification appears.
- Mark one notification read.
- Mark all read.
- Clear one notification.
- Clear all active notifications.
- Change notification preferences.
- Confirm preference-aware creation still behaves as expected.

### 11. Admin workspace

- Open Admin workspace.
- Switch through all tabs.
- Confirm relevant cards appear for each tab.
- Use search filter.
- Use status filter.
- Reset filters.
- Confirm cards return to visible state.
- Confirm mobile layout remains usable.

## In-app smoke panel

Admins should see a **QA smoke checks** card in the dashboard/admin workspace. It runs read-only checks for:

- current user/admin state;
- Phase 29.5 anonymous RPC grant audit;
- required tables;
- required Phase 30 columns;
- key RPC availability via safe calls where possible;
- basic table access counts;
- training parent/session rows;
- opportunity session rows;
- latest Supabase advisor warning counts if available through the app context.

The panel is intended to reveal obvious contract drift quickly. It is not a replacement for manual role testing.

## SQL verification

Run the queries in:

```text
supabase/verification/phase32_smoke_checks.sql
```

Recommended before demos or merge reviews.

Expected high-level results:

- targeted Phase 29.5 RPCs return zero anonymous execute grants;
- Phase 30 columns exist;
- Phase 30 functions exist;
- training session uniqueness index exists;
- required app tables exist;
- no obviously invalid training signup/session references;
- no obviously invalid opportunity signup/session references.

## Known limitations

- Volunteer-vs-admin role-permission testing still requires manual sign-in with separate accounts.
- The in-app QA panel is read-only and does not create test records.
- Browser compatibility still needs human testing.
- Supabase advisor warnings may still include known Phase 33 items.
