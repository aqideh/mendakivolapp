# Phase 26 — Reporting and CSV Exports

This phase adds admin-facing operational reports and browser CSV exports.

## Implemented

### Database layer

Added migration:

- `supabase/migrations/202605110003_phase_twenty_six_reports.sql`

The migration adds admin-only report RPCs:

- `get_admin_volunteer_hours_report(...)`
- `get_admin_attendance_verification_report(...)`
- `get_admin_participation_report(...)`
- `get_admin_training_completion_report(...)`
- `get_admin_referral_report(...)`
- `get_admin_points_report(...)`

Each RPC checks `current_app_user_is_admin()` before returning rows.

### Frontend reporting UI

Added module:

- `assets/reports.js`

Admins now get a Reports and CSV exports dashboard card with:

- report type selector;
- start/end date filters;
- opportunity ID filter where relevant;
- status filter where relevant;
- points reason filter for the points report;
- result preview table;
- browser CSV export.

### Loader

`assets/admin-attendance-code-view.js` now loads:

- `assets/pre-phase-urgent-fixes.js`
- `assets/referrals.js`
- `assets/gamification.js`
- `assets/reports.js`

## Reports included

### Volunteer hours

Rows from attendance claims with claimed and verified hours.

Useful for:

- volunteer hours summary;
- verified hours checks;
- opportunity/session-level hours review.

### Attendance verification

Rows from attendance claims focused on review status and admin notes.

Useful for:

- pending/submitted attendance queue;
- rejected/adjusted/verified review tracking.

### Opportunity participation

Rows from opportunity sign-ups.

Useful for:

- sign-up status tracking;
- session participation;
- confirmed/waitlisted/completed participation.

### Training completion

Rows from training sign-ups.

Useful for:

- training registration/completion operations;
- completion status checks.

### Referrals

Rows from Phase 24 referral tables.

Useful for:

- referral attribution checks;
- accepted/conversion/cancelled referral status reporting.

### Points and achievements

Rows from Phase 25 points ledger.

Useful for:

- points-award verification;
- referral/attendance/training points audit;
- pilot gamification reporting.

## Supabase setup required

Apply the migration:

```sql
supabase/migrations/202605110003_phase_twenty_six_reports.sql
```

Phase 24 and Phase 25 migrations should already be applied if referral and points reports are required.

## Manual QA checklist

### Access control

1. Sign in as a non-admin volunteer.
2. Confirm the Reports and CSV exports card is not shown.
3. Sign in as an admin.
4. Confirm the card appears.

### Report loading

For each report type:

1. Select the report.
2. Run without filters.
3. Confirm rows load or the empty state appears without console errors.
4. Apply a date range and run again.
5. Apply status/reason/opportunity filters where available.
6. Confirm rows remain relevant to the chosen filter.

### CSV export

1. Run a report that returns rows.
2. Click Export CSV.
3. Confirm a CSV downloads.
4. Open the CSV and verify headers/values match the preview.
5. Confirm JSON metadata in points report is exported as a JSON string.

### Data checks

- Volunteer hours report totals should reconcile with attendance claims.
- Attendance verification report should show submitted/reviewed claims.
- Participation report should reconcile with opportunity sign-ups.
- Training report should reconcile with training sign-ups.
- Referral report should reconcile with `app_referrals`.
- Points report should reconcile with `app_points_ledger`.

## Current limitations

- Reports are row-level exports, not aggregated dashboards yet.
- No saved report presets.
- No scheduled email reports.
- No charts or summary cards.
- Opportunity filter currently accepts manual opportunity ID input rather than a dropdown.
- CSV generation is browser-only.
- Very large exports may need pagination or server-side file generation later.

## Roadmap impact

- Phase 27 audit UI should reuse the report preview/export patterns where suitable.
- Phase 31 admin UX refinement should move reports into a dedicated admin page.
- Phase 32 QA should add regression tests for report filters and CSV output.
- Phase 33 production readiness should consider pagination, export size limits, and data-retention policies.
