# MENDAKI Volunteer Hub — Manual QA and Release Readiness

> Supersession note: This checklist describes earlier Supabase-backed prototype behavior and is superseded by the YM Hub/Salesforce product boundary in `docs/product-intent.md`. Opportunity sign-up creation, lifecycle state, final capacity decisions, and final waitlist decisions belong to YM Hub/Salesforce. Any opportunity sign-up QA below is retained as historical prototype context unless the product boundary is explicitly changed and documented.

Last updated: 2026-06-02
Branch: `main`

This checklist is a release gate for the current app-owned surfaces. Do not mark the app production-ready until every required check is completed or explicitly accepted as a known risk.

## Scope

This checklist covers the current primary app path:

```text
Signed-in app dashboard
→ Admin workspace entry
→ Admin workspace
→ Admin pages
→ Admin tables / tools
→ Admin review actions
→ MENDAKIDataAccess / prototype backend or approved integrations
```

It does not validate removed Sveltia CMS or phase-numbered admin paths.

Current product boundary checks must include:

- Volunteer opportunity CTAs route to YM Hub/Salesforce.
- The app does not create authoritative volunteer opportunity sign-ups.
- Supabase opportunity sign-up tables are not treated as production source of truth.
- Training registrations remain distinguishable from volunteer opportunity sign-ups.

## Required accounts

Use separate accounts. Do not test admin and volunteer behavior from the same signed-in session.

| Role | Required state | Notes |
|---|---|---|
| Admin | Authenticated app user with `admin` or `super_admin` role | Must open admin workspace and run QA checks. |
| Volunteer A | Authenticated non-admin volunteer | Used for attendance, clarification response, training sign-up, referrals, notifications, points visibility, and opportunity CTA checks. |
| Volunteer B | Authenticated non-admin volunteer | Used for referral conversion checks and any non-authoritative mirror/read-only opportunity display checks. |

## Required sample data

Before manual QA, confirm the database or approved integration has at least:

- One open opportunity display record with a YM Hub/Salesforce CTA target or approved external sign-up URL.
- One opportunity session or display record suitable for attendance-support testing where applicable.
- One valid facilitator attendance code linked to the target opportunity/session if attendance code validation is in scope.
- One attendance claim in each relevant state, or enough data to create them during the test: `checked_in`, `submitted`, and `clarification_requested`.
- One training session open for registration.
- One training sign-up to review.
- One referral record to review, or enough volunteer accounts to create one.
- At least one notification row after triggering admin or volunteer actions.
- At least one audit log row after triggering admin review actions.

Historical sample-data note: old checks for pending/waitlisted opportunity sign-ups are prototype-only unless those records are read-only mirrors from YM Hub/Salesforce or explicitly approved test data.

## Pre-test setup

- [ ] Confirm branch under test is the intended release branch.
- [ ] Deploy or open the build that includes the target commit.
- [ ] Open the app with cache busting: `?v=<commit>`.
- [ ] Clear browser storage or use a fresh browser profile before starting role-specific tests.
- [ ] Confirm Supabase project, if used, is the intended prototype/pilot project.
- [ ] Confirm YM Hub/Salesforce opportunity CTA target is configured where needed.
- [ ] Confirm leaked-password protection setting has been reviewed in Supabase Auth console if Supabase Auth is used.
- [ ] Confirm production Auth redirect URLs and email templates have been reviewed if Supabase Auth is used.
- [ ] Confirm `docs/product-intent.md` and `docs/ai-development-guide.md` match the tested behavior.

## Database and smoke checks

### SQL validation

- [ ] Run latest SQL validation checks against the Supabase project if Supabase is used.
- [ ] Confirm required `app_*` tables exist for in-scope prototype/app-owned areas.
- [ ] Confirm sensitive RPCs are not executable by `anon`.
- [ ] Confirm admin report and audit RPCs are callable by an admin context.
- [ ] Confirm no SQL/RPC behavior is treated as authoritative for volunteer opportunity sign-up production records unless approved integration docs say so.
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
- [ ] Confirm required table access passes for in-scope app-owned areas.
- [ ] Confirm grant audit has no targeted `anon` exposure.
- [ ] Confirm training, attendance, reports, audit, and operational count checks complete without failures.
- [ ] Confirm opportunity sign-up checks are either removed, read-only, or explicitly labelled prototype/non-authoritative.
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
- [ ] Select an opportunity CTA.
- [ ] Confirm the CTA routes to YM Hub/Salesforce or the approved authoritative sign-up destination.
- [ ] Confirm the app does not create an in-app volunteer opportunity sign-up as a side effect of the CTA.
- [ ] Browse training.
- [ ] Sign up for an open training session.
- [ ] Confirm training sign-up appears in dashboard.
- [ ] Open notifications panel/history if available.

## Historical admin sign-up queue load and search

This section is retained only for prototype regression context. Do not use it as evidence that this app owns production opportunity sign-ups.

As admin, if a prototype or read-only mirror sign-up queue still exists:

- [ ] Open Admin workspace.
- [ ] Open Sign-ups queue.
- [ ] Use Refresh queue.
- [ ] Confirm rows are labelled as prototype, legacy, or read-only mirror where appropriate.
- [ ] Search by volunteer name.
- [ ] Search by email.
- [ ] Search by opportunity title.
- [ ] Filter by status if available.
- [ ] Open a sign-up row.
- [ ] Confirm drawer/details are human-readable and do not expose raw JSON as primary UI.
- [ ] Confirm no production sign-up creation or final lifecycle decision is made inside this app unless approved and documented.

## Historical sign-up review actions

This section is retained only for prototype regression context. Current product QA should prefer YM Hub/Salesforce redirect and read-only mirror validation.

For at least one pending prototype or read-only mirror record, where applicable:

- [ ] Confirm the UI does not imply this app is the final authority for opportunity participation.
- [ ] Confirm any review action is either disabled, prototype-only, or explicitly approved.
- [ ] Confirm capacity behavior is not represented as final production capacity unless sourced from YM Hub/Salesforce.
- [ ] Confirm volunteer dashboard state is not presented as official unless sourced from YM Hub/Salesforce.
- [ ] Confirm notification/audit rows are created only for in-scope app-owned actions.

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
- [ ] Confirm verified hours are reflected in volunteer statistics where this app owns the display.
- [ ] Confirm associated completion state updates only where that behavior is approved for this app.
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
- [ ] Run Opportunity participation report only if its data is sourced from YM Hub/Salesforce, an approved read-only mirror, or clearly labelled non-authoritative prototype data.
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
- [ ] Confirm relevant opportunity redirect/status, attendance, training, referral, or points notifications are visible.
- [ ] Mark notifications read where supported.
- [ ] Confirm read state persists after refresh.

## Deployment validation

Use cache-busting for every deployment check:

```text
https://aqideh.github.io/mendakivolapp/?v=<commit>
```

Required deployment checks:

- [ ] Confirm app loads without console errors on initial page load.
- [ ] Confirm Supabase client initializes if configured.
- [ ] Confirm sign-in flow opens.
- [ ] Confirm volunteer dashboard loads after sign-in.
- [ ] Confirm admin workspace loads after admin sign-in.
- [ ] Confirm opportunity CTAs route to YM Hub/Salesforce or approved authoritative destination.
- [ ] Confirm opportunity CTAs do not create localStorage or Supabase opportunity sign-ups unless explicitly approved.
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

- YM Hub/Salesforce CTA destination and ownership confirmed.
- Opportunity reporting source-of-truth decision recorded.
- Supabase leaked-password protection setting reviewed/enabled if Supabase Auth is used.
- Production Auth redirect URLs verified if Supabase Auth is used.
- Production email templates verified if Supabase Auth is used.
- Authenticated `SECURITY DEFINER` RPC warning handling decision recorded where relevant.
- Decision recorded for old non-`app_*` tables and derived views.
- Decision recorded for manual points adjustment policy.
