# MENDAKI Volunteer Hub — Development Roadmap

Last updated: after Phase 41 validation assets.

## Current status

The app is a Supabase-backed pilot/beta volunteer management app. Sveltia CMS is deprecated as the production admin path. The authoritative admin path is now:

```text
Signed-in app dashboard → Admin workspace entry → Single admin shell → Canonical workflow pages → Table queues and drawers → drawer review actions with notes/hours/referral status + fallback tools where needed
```

The current app includes:

- Supabase Auth.
- Dashboard and admin tools.
- Phase 34 single admin shell entry point and admin navigation.
- Phase 35 canonical admin pages with collapsed legacy fallback tools.
- Phase 36 table queues and detail drawers for key admin workflows.
- Phase 37 visible legacy admin surface retirement from the main dashboard.
- Phase 38 drawer review actions for opportunity sign-ups, attendance claims, and training sign-ups.
- Phase 39 drawer admin notes, attendance verified-hours input, and inline action feedback.
- Phase 40 referral status workflow in the admin drawer.
- Phase 41 validation assets for SQL and browser smoke checks.
- Points adjustment remains policy-gated and read-only.
- Phase 31 admin workspace support retained for compatibility but retired as a primary visible surface.
- Phase 32 QA smoke-check panel and verification SQL.
- Phase 33 production-readiness verification SQL and runbook.
- Hierarchical opportunity/session editing.
- Session-specific opportunity signups.
- Session-aware attendance validation foundation.
- Phase 29.5 attendance session guard.
- Attendance review.
- Training lifecycle with Phase 30 training session parity foundation.
- Phase 31 training parent/session management UI.
- Referrals / invite friends.
- Points and achievements.
- Reports and browser CSV exports.
- Audit history UI.
- Notification history, preferences, grouping, and routing polish.
- Admin operations/warning cards.
- Deprecated Sveltia CMS path.

The app remains pilot/beta until manual QA, Auth console settings, and production policy decisions are completed.

## Recently completed phases

### Phase 40 — Referral and Points Admin Workflows

Implemented referral workflow support while keeping points adjustment policy-gated.

Primary files:

```text
supabase/migrations/202605110011_phase_forty_referral_admin_workflow.sql
assets/referrals.js
assets/phase-thirty-eight-drawer-review-actions.js
docs/phase-forty-referral-points-admin-workflows.md
```

### Phase 41 — Validation Assets

Generated non-destructive validation assets for the current QA gate:

- Supabase SQL validation checks for Phase 34–40 prerequisites and security posture.
- Browser-console admin UI smoke script for shell/table/drawer wiring.
- Phase 41 validation runbook with pass criteria and failure handling.

Primary files:

```text
supabase/verification/phase41_validation_checks.sql
scripts/phase41-admin-ui-smoke.js
docs/phase-forty-one-validation-runbook.md
```

## Full phase history

For prior implementation details, see the individual phase docs in `docs/` and verification SQL in `supabase/verification/`.

## Current consolidation roadmap

The next work should remain validation-focused:

```text
Phase 41 — Manual QA and Production Gate Review
```

Do not add new feature/UI layers until the validation assets have been run and reviewed.

## Phase 41 — Manual QA and Production Gate Review

Purpose: validate the single admin interface and decide what can be retired safely.

Recommended scope:

- Run `supabase/verification/phase41_validation_checks.sql`.
- Run `scripts/phase41-admin-ui-smoke.js` as a signed-in admin.
- Run the Phase 32 manual QA checklist with separate volunteer and admin accounts.
- Verify Phase 34–40 admin shell, tables, drawers, and drawer actions.
- Verify referral status drawer actions and audit entries.
- Re-run Phase 32 and Phase 33 verification checks.
- Decide whether fallback legacy tools can be removed or must remain.
- Decide whether points adjustment is policy-approved.
- Confirm Supabase Auth redirect URLs and email templates.
- Enable leaked-password protection in Supabase Auth console.

Safety rule:

```text
Do not delete fallback action tools until drawer actions are manually QA-tested with separate admin and volunteer accounts.
```

## Production/manual requirements still pending

Do not treat the app as production-complete until these are done:

1. Run the Phase 41 SQL validation checks.
2. Run the Phase 41 browser admin UI smoke script.
3. Run the Phase 32 manual QA checklist with separate volunteer and admin accounts.
4. Enable leaked-password protection in Supabase Auth console.
5. Verify production Auth redirect URLs and email templates.
6. Run the in-app QA panel as admin.
7. Re-run Phase 32 and Phase 33 SQL verification.
8. Decide how to handle remaining authenticated `SECURITY DEFINER` RPC warnings.
9. Decide whether legacy non-`app_*` tables and `volunteer_verified_hour_totals` can be removed.
10. Decide whether points adjustment is policy-approved.

## Later follow-up items

Keep these visible but do not let them override manual QA / production settings:

- Public referral landing page.
- Referral conversion workflow.
- Email notification delivery.
- Notification analytics/delivery audit.
- Leaderboard, if policy-approved.
- Configurable points rules.
- Admin points adjustment UI.
- Report aggregation/charts.
- Saved report presets.
- Scheduled report emails.
- Exact-record notification deep links.
- Automated migration test suite.
