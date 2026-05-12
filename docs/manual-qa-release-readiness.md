# MENDAKI Volunteer Hub — Manual QA and Release Readiness

Last updated: 2026-05-12
Branch: `expansion`

This checklist is the release gate for the current Supabase-backed pilot. Do not mark the app production-ready until every required check is completed or explicitly accepted as a known risk.

## Scope

This checklist covers the current primary app path:

```text
Signed-in app dashboard
→ Admin workspace entry
→ Admin workspace
→ Admin pages
→ Admin tables / tools
→ Admin review actions
→ MENDAKIDataAccess / Supabase RPCs
```

It does not validate removed Sveltia CMS or phase-numbered admin paths.

## Required accounts

Use separate accounts. Do not test admin and volunteer behavior from the same signed-in session.

| Role | Required state | Notes |
|---|---|---|
| Admin | Authenticated app user with `admin` or `super_admin` role | Must open admin workspace and run QA checks. |
| Volunteer A | Authenticated non-admin volunteer | Used for opportunity sign-up, attendance, clarification response, training sign-up, referrals, notifications, and points visibility. |
| Volunteer B | Authenticated non-admin volunteer | Used for waitlist/capacity and referral conversion checks. |

## Required sample data

Before manual QA, confirm the database has at least:

- One open opportunity with at least one configured session.
- One opportunity session with finite capacity for waitlist/capacity behavior.
- One valid facilitator attendance code linked to the target opportunity/session.
- One pending opportunity sign-up.
- One waitlisted or capacity-sensitive opportunity sign-up scenario.
- One attendance claim in each relevant state, or enough data to create them during the test: `checked_in`, `submitted`, and `clarification_requested`.
- One training session open for registration.
- One training sign-up to review.
- One referral record to review, or enough volunteer accounts to create one.
- At least one notification row after triggering admin or volunteer actions.
- At least one audit log row after triggering admin review actions.

## Pre-test setup

- [ ] Confirm branch under test is `expansion`.
- [ ] Deploy or open the build that includes the target commit.
- [ ] Open the app with cache busting: `?v=<commit>`.
- [ ] Clear browser storage or use a fresh browser profile before starting role-specific tests.
- [ ] Confirm Supabase project is the intended pilot project.
- [ ] Confirm leaked-password protection setting has been reviewed in Supabase Auth console.
- [ ] Confirm production Auth redirect URLs and email templates have been reviewed.

## Database and smoke checks

### SQL validation

- [ ] Run latest SQL validation checks against the Supabase project.
- [ ] Confirm required `app_*` tables exist.
- [ ] Confirm sensitive RPCs are not executable by `anon`.
- [ ] Confirm admin report and audit RPCs are callable by an admin context.
- [ ] Record validation date, operator, and result.

Result notes:

```text
Date:
Operator:
Commit:
Result:
Open risks:
```

### Signed-in admin browser smoke

As admin:

- [ ] Sign in successfully.
- [ ] Open dashboard.
- [ ] Confirm admin workspace entry is visible.
- [ ] Open admin workspace.
- [ ] Open System / QA area.
- [ ] Run QA smoke checks from the in-app admin QA panel.
- [ ] Confirm required table access passes.
- [ ] Confirm grant audit has no targeted `anon` exposure.
- [ ] Confirm training, opportunity, attendance, reports, audit, and operational count checks complete without failures.
- [ ] Record warnings separately; do not ignore them.

Result notes:

```text
Date:
Admin account:
Commit:
Passed:
Warnings:
Failures:
```

## Volunteer account flow

As Volunteer A:

- [ ] Sign in successfully.
- [ ] Confirm dashboard is visible.
- [ ] Update profile details.
- [ ] Confirm profile details persist after refresh.
- [ ] Confirm admin workspace is not visible.
- [ ] Browse opportunities.
- [ ] Sign up for an open opportunity session.
- [ ] Confirm sign-up appears in the volunteer dashboard.
- [ ] Confirm status is pending/review state until admin action.
- [ ] Browse training.
- [ ] Sign up for an open training session.
- [ ] Confirm training sign-up appears in dashboard.
- [ ] Open notifications panel/history if available.

## Admin sign-up queue load and search

As admin:

- [ ] Open Admin workspace.
- [ ] Open Sign-ups queue.
- [ ] Use Refresh queue.
- [ ] Confirm pending/waitlisted sign-up rows load.
- [ ] Search by volunteer name.
- [ ] Search by email.
- [ ] Search by opportunity title.
- [ ] Filter by status if available.
- [ ] Open a sign-up row.
- [ ] Confirm drawer/details are human-readable and do not expose raw JSON as primary UI.

## Sign-up review actions

For at least one pending sign-up:

- [ ] Confirm the sign-up.
- [ ] Confirm status updates to `confirmed`.
- [ ] Confirm capacity behavior is respected.
- [ ] Confirm volunteer dashboard updates after refresh/sign-in.
- [ ] Confirm volunteer notification is created where applicable.
- [ ] Confirm audit log row is created.

For at least one sign-up suitable for waitlist:

- [ ] Waitlist the sign-up.
- [ ] Confirm status updates to `waitlisted`.
- [ ] Confirm volunteer dashboard reflects waitlist status.
- [ ] Confirm notification/audit rows are created where applicable.

For at least one sign-up suitable for decline:

- [ ] Decline the sign-up.
- [ ] Confirm status updates to `declined`.
- [ ] Confirm volunteer dashboard reflects declined status.
- [ ] Confirm notification/audit rows are created where applicable.

## Attendance verification actions

Prepare an attendance claim by having Volunteer A check in/out using a valid facilitator code, or use existing sample data.

As admin:

- [ ] Open Attendance queue.
- [ ] Use Refresh queue.
- [ ] Confirm attendance rows load.
- [ ] Search by volunteer name/email/opportunity.
- [ ] Open an attendance row.

Verify action:

- [ ] Verify a submitted claim.
- [ ] Confirm claim status updates to `verified`.
- [ ] Confirm verified hours are reflected in volunteer statistics.
- [ ] Confirm associated sign-up/completion state updates as expected.
- [ ] Confirm notification and audit rows are created.

Adjustment action:

- [ ] Adjust verified hours where supported.
- [ ] Confirm adjusted hours persist.
- [ ] Confirm volunteer dashboard reflects adjusted hours.
- [ ] Confirm audit row captures the adjustment.

Clarification action:

- [ ] Request clarification.
- [ ] Confirm admin message is required.
- [ ] Confirm claim status updates to `clarification_requested`.
- [ ] Confirm volunteer receives/has access to clarification request.
- [ ] Confirm notification and audit rows are created.

Reject action:

- [ ] Reject a claim.
- [ ] Confirm claim status updates to `rejected`.
- [ ] Confirm volunteer dashboard does not count rejected hours.
- [ ] Confirm notification and audit rows are created.

## Volunteer clarification response flow

As Volunteer A:

- [ ] Sign in after an admin clarification request.
- [ ] Open the relevant attendance item.
- [ ] Enter a clarification response.
- [ ] Submit the response.
- [ ] Confirm response persists after refresh.

As admin:

- [ ] Open the same attendance claim.
- [ ] Confirm clarification response and response timestamp are visible.
- [ ] Verify, adjust, or reject the claim after reviewing the response.

## Training sign-up review

As Volunteer A:

- [ ] Sign up for an open training session.
- [ ] Confirm sign-up appears in volunteer dashboard.

As admin:

- [ ] Open Training area.
- [ ] Refresh training rows.
- [ ] Confirm training sessions load.
- [ ] Open training sign-up queue/table if available.
- [ ] Confirm registered/waitlisted sign-ups load.
- [ ] Mark a training sign-up completed where supported.
- [ ] Confirm volunteer dashboard reflects completion.
- [ ] Confirm notification and audit rows are created where applicable.

## Referral review

As Volunteer A:

- [ ] Generate or view referral code if available.
- [ ] Share referral code with Volunteer B.

As Volunteer B:

- [ ] Accept referral code or complete referral flow.

As admin:

- [ ] Open Referrals queue/table.
- [ ] Confirm referral row appears.
- [ ] Review referral status and metadata.
- [ ] Confirm referral-related notification/points behavior follows current policy.
- [ ] Confirm audit row is created where applicable.

## Points ledger read-only review

As admin:

- [ ] Open Points area.
- [ ] Confirm points ledger loads.
- [ ] Confirm ledger is read-only unless manual adjustment policy has been approved.
- [ ] Confirm point entries correspond to verified attendance, completed training, referral acceptance, or approved adjustments.
- [ ] Confirm no unapproved manual adjustment UI is active.

As Volunteer A:

- [ ] Confirm points total and achievements are visible where expected.
- [ ] Confirm rejected attendance does not award points.

## Admin reports export

As admin:

- [ ] Open Reports area.
- [ ] Run Volunteer hours report.
- [ ] Run Attendance verification report.
- [ ] Run Opportunity participation report.
- [ ] Run Training completion report.
- [ ] Run Referrals report.
- [ ] Run Points report.
- [ ] Export at least one populated report to CSV.
- [ ] Confirm CSV downloads and opens with expected columns.
- [ ] Confirm filters work for date/status/opportunity where applicable.

## Audit search

As admin:

- [ ] Open Audit area.
- [ ] Search without filters.
- [ ] Search by date range.
- [ ] Search by action type.
- [ ] Search by entity type.
- [ ] Search by actor.
- [ ] Search by target.
- [ ] Select an audit row.
- [ ] Confirm row details are visible.
- [ ] Export audit rows to CSV.

## Notifications history

As admin:

- [ ] Open Notifications area.
- [ ] Refresh notification history.
- [ ] Confirm recent admin-triggered notifications are visible.
- [ ] Confirm notification preference rows load if table/policy allows.

As Volunteer A:

- [ ] Open notifications panel/history.
- [ ] Confirm relevant opportunity, attendance, training, referral, or points notifications are visible.
- [ ] Mark notifications read where supported.
- [ ] Confirm read state persists after refresh.

## Deployment validation

Use cache-busting for every deployment check:

```text
https://aqideh.github.io/mendakivolapp/?v=<commit>
```

Required deployment checks:

- [ ] Confirm app loads without console errors on initial page load.
- [ ] Confirm Supabase client initializes.
- [ ] Confirm sign-in flow opens.
- [ ] Confirm volunteer dashboard loads after sign-in.
- [ ] Confirm admin workspace loads after admin sign-in.
- [ ] Confirm `index.html` loads responsibility-named admin scripts:
  - `assets/admin-ux.js`
  - `assets/admin-qa.js`
  - `assets/admin-tables.js`
  - `assets/admin-queue-sync.js`
  - `assets/admin-review-actions.js`
  - `assets/admin-tools.js`
  - `assets/admin-pages.js`
  - `assets/admin-workspace.js`
- [ ] Confirm `index.html` loads responsibility-named admin stylesheets:
  - `assets/admin-workspace.css`
  - `assets/admin-pages.css`
  - `assets/admin-tables.css`
  - `assets/admin-qa.css`
- [ ] Confirm deleted phase-numbered admin files are not requested by the browser network panel.

## Final release decision

Release decision must be one of:

- `Approved for pilot`
- `Approved with known risks`
- `Blocked`

Record the final decision:

```text
Decision:
Commit:
Date:
Approved by:
Known risks:
Follow-up issues:
```

## Known non-code gates

These require console/policy decisions and cannot be closed only by repository changes:

- Supabase leaked-password protection setting reviewed/enabled.
- Production Auth redirect URLs verified.
- Production email templates verified.
- Authenticated `SECURITY DEFINER` RPC warning handling decision recorded.
- Decision recorded for old non-`app_*` tables and derived views.
- Decision recorded for manual points adjustment policy.
