# MENDAKI Volunteer Hub — Development Roadmap

Last updated: 2026-05-12

This document records the current cleanup and development direction for the `expansion` branch.

The current workstream has stabilised the primary application path. Duplicated compatibility paths, phase-numbered bridge modules, and development-facing UI copy were removed where covered by the cleanup stream.

## Current principles

1. **Primary function first** — production behavior should live in the canonical module for that responsibility.
2. **No duplicate compatibility path** — when a workflow is moved, update consumers and remove the old module/global namespace.
3. **No development-process copy in user UI** — visible app copy should describe operational behavior, not implementation history.
4. **Explicit script ownership** — modules should be loaded by responsibility name, not by historical phase number.
5. **Admin workflows use the data access layer** — sign-up review, attendance review, training review, queue refresh, and related actions should call `MENDAKIDataAccess` rather than writing directly from UI modules.
6. **Admin queues refresh from source data** — sign-up and attendance queue tables should show current records through the primary admin queue refresh path.

## Current status

The app is a Supabase-backed volunteer management pilot. Sveltia CMS and earlier phase-layered admin surfaces are no longer the intended production admin path.

The authoritative admin path is now:

```text
Signed-in app dashboard
→ Admin workspace entry
→ Admin workspace
→ Admin pages
→ Admin tables / tools
→ Admin review actions
→ MENDAKIDataAccess / Supabase RPCs
```

The current development cleanup phases are complete. The app remains pilot/beta until manual QA, Auth console settings, production policy decisions, and final release checks are completed.

## Completed work in the current cleanup stream

### Admin sign-up queue and attendance review stabilization

- Fixed the opportunity sign-up queue so pending sign-ups render in the admin interface.
- Corrected search/filter behavior that previously showed `No matching records` despite loaded pending rows.
- Removed raw-record display from the individual review item UI.
- Moved the individual admin review item toward a friendlier centered interaction where applicable.
- Added a compulsory admin message when requesting attendance clarification.
- Added the volunteer clarification response path so users can respond when a clarification request is received.

### Data and admin workflow cleanup

- Started separating workflow actions from `data-store.js`.
- Reduced `data-store.js` toward auth/session/profile/cache responsibilities.
- Moved active opportunity, training, and attendance action routing into a responsibility-named module:
  - `assets/volunteer-actions.js`
- Removed old direct attendance write behavior from the active UI action path.
- Added admin training-session fetch/save/delete methods to `MENDAKIDataAccess` so the admin UX module no longer writes training rows directly.

### Admin module responsibility renames

The following phase-numbered admin modules were consolidated into responsibility-named modules:

| Responsibility | New module | Old module removed |
|---|---|---|
| Volunteer/admin action routing | `assets/volunteer-actions.js` | `assets/phase-twenty-nine-five-hardening.js` |
| Admin table rendering | `assets/admin-tables.js` | `assets/phase-thirty-six-admin-tables.js` |
| Admin workspace shell | `assets/admin-workspace.js` | `assets/phase-thirty-four-admin-shell.js` |
| Admin pages router | `assets/admin-pages.js` | `assets/phase-thirty-five-canonical-admin-pages.js` |
| Admin review actions | `assets/admin-review-actions.js` | `assets/phase-thirty-eight-drawer-review-actions.js` |
| Admin queue sync | `assets/admin-queue-sync.js` | `assets/phase-forty-two-admin-queue-sync.js` |
| Admin tools | `assets/admin-tools.js` | `assets/phase-forty-two-canonical-admin-tools.js` |
| Admin UX | `assets/admin-ux.js` | `assets/phase-thirty-one-admin-ux.js` |
| Admin QA | `assets/admin-qa.js` | `assets/phase-thirty-two-qa-tools.js` |
| Admin workspace CSS | `assets/admin-workspace.css` | `assets/phase-thirty-one-admin-ux.css`, `assets/phase-thirty-four-admin-shell.css` |
| Admin pages CSS | `assets/admin-pages.css` | `assets/phase-thirty-five-canonical-admin-pages.css` |
| Admin tables CSS | `assets/admin-tables.css` | `assets/phase-thirty-six-admin-tables.css` |
| Admin QA CSS | `assets/admin-qa.css` | `assets/phase-thirty-two-qa-tools.css` |

### Active responsibility-named scripts

`index.html` now loads these responsibility-named admin modules:

```text
assets/volunteer-actions.js
assets/admin-ux.js
assets/admin-qa.js
assets/admin-tables.js
assets/admin-queue-sync.js
assets/admin-review-actions.js
assets/admin-tools.js
assets/admin-pages.js
assets/admin-workspace.js
```

### Active responsibility-named stylesheets

`index.html` now loads these responsibility-named admin stylesheets:

```text
assets/admin-workspace.css
assets/admin-pages.css
assets/admin-tables.css
assets/admin-qa.css
```

### Active primary namespaces

```text
window.MENDAKIVolunteerActions
window.MENDAKIAdminUX
window.MENDAKIAdminQA
window.MENDAKIAdminTables
window.MENDAKIAdminQueueSync
window.MENDAKIAdminReviewActions
window.MENDAKIAdminTools
window.MENDAKIAdminPages
window.MENDAKIAdminWorkspace
```

### Removed old admin namespaces from active use

```text
MENDAKIPhase31AdminUX
MENDAKIPhase32QA
MENDAKIPhase34AdminShell
MENDAKIPhase35CanonicalAdminPages
MENDAKIPhase36AdminTables
MENDAKIPhase38DrawerActions
MENDAKIPhase42AdminQueueSync
MENDAKIPhase42CanonicalAdminTools
```

### Session validation and admin tools cleanup

- Removed the session validation bridge module.
- Made session attendance validation render directly through the primary admin tools/system page path.
- Removed development-facing bridge/legacy/compatibility wording from the admin UI where handled.
- Replaced dynamic feature script loading with explicit primary script loading where completed.

### Phase 14 — Admin queue sync module rename

Completed:

- Renamed `assets/phase-forty-two-admin-queue-sync.js` to `assets/admin-queue-sync.js`.
- Updated script loading in `index.html`.
- Replaced the phase-numbered queue sync install flag, render wrapper marker, global namespace, and queue refresh data attributes.
- Removed direct references to old admin shell/table namespaces from the queue sync module.
- Deleted the old phase-numbered file after active consumers were updated.

Primary namespace:

```text
window.MENDAKIAdminQueueSync
```

### Phase 15 — Admin tools module rename

Completed:

- Renamed `assets/phase-forty-two-canonical-admin-tools.js` to `assets/admin-tools.js`.
- Updated script loading in `index.html`.
- Updated `admin-pages.js` to call the responsibility-named `MENDAKIAdminTools` namespace.
- Replaced the phase-numbered admin tools install flag, state object, global namespace, page data attributes, form data attributes, table row action attributes, export attributes, and notification load attributes.
- Deleted the old phase-numbered file after active consumers were updated.

Primary namespace:

```text
window.MENDAKIAdminTools
```

### Phase 16 — CSS responsibility cleanup

Completed:

- Replaced phase-numbered admin stylesheet loading in `index.html` with responsibility-named admin stylesheets.
- Consolidated admin UX and admin shell styles into `assets/admin-workspace.css`.
- Moved admin page styles into `assets/admin-pages.css`.
- Moved admin table and drawer styles into `assets/admin-tables.css`.
- Moved admin QA panel styles into `assets/admin-qa.css`.
- Deleted the old phase-numbered CSS files after the replacement stylesheets were added and `index.html` was updated.

Active admin stylesheet ownership:

```text
assets/admin-workspace.css
assets/admin-pages.css
assets/admin-tables.css
assets/admin-qa.css
```

### Phase 17 — Final primary-path scan

Completed:

- Scanned active admin HTML/JS/CSS for deleted-file references and stale phase-numbered admin namespaces.
- Replaced `assets/phase-thirty-one-admin-ux.js` with `assets/admin-ux.js`.
- Replaced `assets/phase-thirty-two-qa-tools.js` with `assets/admin-qa.js`.
- Updated `index.html` to load `assets/admin-ux.js` and `assets/admin-qa.js`.
- Deleted the old phase-numbered admin UX and admin QA modules after active consumers were updated.
- Replaced implementation-facing `data-phase31-*` and `data-phase32-*` admin attributes in the new modules with responsibility-named `data-admin-*` attributes.
- Routed admin training-session fetch/save/delete operations through `MENDAKIDataAccess` instead of direct UI-module Supabase writes.
- Verified no remaining references to deleted Phase 31/32 admin files or old admin phase namespaces were found by repository search.

Primary namespaces:

```text
window.MENDAKIAdminUX
window.MENDAKIAdminQA
```

### Phase 18 — Manual QA checklist and release readiness

Completed:

- Added `docs/manual-qa-release-readiness.md` as the dedicated release gate checklist.
- Documented required admin and volunteer test accounts.
- Documented required sample data.
- Documented SQL validation and signed-in admin browser smoke checks.
- Documented manual QA flows for:
  - Volunteer account behavior
  - Admin sign-up queue load and search
  - Sign-up confirm / waitlist / decline actions
  - Attendance verify / adjust / clarification / reject actions
  - Volunteer clarification response
  - Training sign-up review
  - Referral review
  - Points ledger read-only review
  - Admin reports export
  - Audit search
  - Notifications history
- Documented deployment validation using cache busting: `?v=<commit>`.
- Documented final release decision states and known non-code gates.

## Remaining release gates

There are no additional development phases in this roadmap. Remaining work is release validation and policy/console decisions:

1. Run the latest SQL validation checks.
2. Run the browser admin UI smoke script as a signed-in admin.
3. Run the manual QA checklist with separate volunteer and admin accounts.
4. Enable or explicitly decide leaked-password protection in Supabase Auth console.
5. Verify production Auth redirect URLs and email templates.
6. Run the in-app QA panel as admin.
7. Decide how to handle remaining authenticated `SECURITY DEFINER` RPC warnings.
8. Decide whether old non-`app_*` tables and derived views can be removed.
9. Decide whether points adjustment is policy-approved.

## Operational notes

- The current branch is `expansion`.
- The app remains a static frontend backed by Supabase.
- Admin access should come from authenticated backend role data, not demo email detection.
- Attendance integrity depends on session-specific facilitator code validation.
- Opportunity sign-up status and attendance updates should remain routed through transactional Supabase RPCs where available.
- Capacity and waitlist behavior should be enforced by the primary sign-up review path.
- Manual QA and release readiness are tracked in `docs/manual-qa-release-readiness.md`.

## Recent cleanup commit anchors

These commits are useful reference points for the cleanup sequence:

- `b992963` — removed phase-numbered volunteer action router.
- `56e51cc` — removed phase-numbered admin table module.
- `881afcc` — removed phase-numbered admin shell module.
- `db235c8` — removed phase-numbered admin pages module.
- `9f9fdd0` — removed phase-numbered drawer review actions module.
- `452ed50` — added responsibility-named admin queue sync module.
- `963f0c7` — removed phase-numbered admin queue sync module.
- `0d55835` — added responsibility-named admin tools module.
- `ee152d2` — removed phase-numbered admin tools module.
- `1978472` — added responsibility-named admin workspace styles.
- `8c3c176` — loaded responsibility-named admin stylesheets.
- `0493741` — removed phase-numbered admin table stylesheet.
- `ffa875e` — routed admin training session writes through `MENDAKIDataAccess`.
- `dac81c1` — added responsibility-named admin UX module.
- `3b50e15` — added responsibility-named admin QA module.
- `b5d0b85` — loaded responsibility-named admin UX and QA scripts.
- `b976003` — removed phase-numbered admin QA module.
- `721d68e` — added manual QA and release readiness checklist.

## Next recommended step

Run the release gates in `docs/manual-qa-release-readiness.md` against the deployed `expansion` build using `?v=<commit>` cache busting. Do not mark the app production-ready until the release decision section in that checklist is completed.
