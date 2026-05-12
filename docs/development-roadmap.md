# MENDAKI Volunteer Hub — Development Roadmap

Last updated: 2026-05-12

This document records the current cleanup and development direction for the `expansion` branch.

The current workstream is focused on stabilising the primary application path. Duplicated compatibility paths, phase-numbered bridge modules, and development-facing UI copy should be removed rather than preserved.

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

The app remains pilot/beta until manual QA, Auth console settings, production policy decisions, and final release checks are completed.

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

### Admin module responsibility renames

The following phase-numbered admin modules were consolidated into responsibility-named modules:

| Responsibility | New module | Old module removed |
|---|---|---|
| Volunteer/admin action routing | `assets/volunteer-actions.js` | `assets/phase-twenty-nine-five-hardening.js` |
| Admin table rendering | `assets/admin-tables.js` | `assets/phase-thirty-six-admin-tables.js` |
| Admin workspace shell | `assets/admin-workspace.js` | `assets/phase-thirty-four-admin-shell.js` |
| Admin pages router | `assets/admin-pages.js` | `assets/phase-thirty-five-canonical-admin-pages.js` |
| Admin review actions | `assets/admin-review-actions.js` | `assets/phase-thirty-eight-drawer-review-actions.js` |

### Active responsibility-named scripts

`index.html` now loads these responsibility-named modules:

```text
assets/volunteer-actions.js
assets/admin-tables.js
assets/admin-review-actions.js
assets/admin-pages.js
assets/admin-workspace.js
```

### Active primary namespaces

```text
window.MENDAKIVolunteerActions
window.MENDAKIAdminTables
window.MENDAKIAdminReviewActions
window.MENDAKIAdminPages
window.MENDAKIAdminWorkspace
```

### Removed old admin namespaces from active use

```text
MENDAKIPhase34AdminShell
MENDAKIPhase35CanonicalAdminPages
MENDAKIPhase36AdminTables
MENDAKIPhase38DrawerActions
```

### Session validation and admin tools cleanup

- Removed the session validation bridge module.
- Made session attendance validation render directly through the primary admin tools/system page path.
- Removed development-facing bridge/legacy/compatibility wording from the admin UI where handled.
- Replaced dynamic feature script loading with explicit primary script loading where completed.

## Remaining roadmap

### Phase 14 — Admin queue sync module rename

Target:

- Rename `assets/phase-forty-two-admin-queue-sync.js` to `assets/admin-queue-sync.js`.
- Update script loading in `index.html`.
- Update any globals or data attributes that still carry phase-numbered names.
- Delete the old phase-numbered file after active consumers are updated.
- Verify that opportunity sign-up and attendance queue refresh still work from the admin workspace.

Expected primary namespace:

```text
window.MENDAKIAdminQueueSync
```

### Phase 15 — Admin tools module rename

Target:

- Rename `assets/phase-forty-two-canonical-admin-tools.js` to `assets/admin-tools.js`.
- Update `admin-pages.js` to call the responsibility-named namespace.
- Replace phase-numbered data attributes where they are implementation-facing and not needed for styling/tests.
- Delete the old phase-numbered file after consumers are updated.

Expected primary namespace:

```text
window.MENDAKIAdminTools
```

### Phase 16 — CSS responsibility cleanup

Target:

- Review phase-numbered CSS still loaded in `index.html`:
  - `assets/phase-thirty-one-admin-ux.css`
  - `assets/phase-thirty-two-qa-tools.css`
  - `assets/phase-thirty-four-admin-shell.css`
  - `assets/phase-thirty-five-canonical-admin-pages.css`
  - `assets/phase-thirty-six-admin-tables.css`
- Rename or consolidate CSS into responsibility-named files where safe:
  - `assets/admin-workspace.css`
  - `assets/admin-pages.css`
  - `assets/admin-tables.css`
  - `assets/admin-qa.css`
- Update `index.html` stylesheet references.
- Delete old phase-numbered CSS only after classes/selectors are confirmed still covered.

### Phase 17 — Final primary-path scan

Target:

- Scan JavaScript, HTML, CSS, and visible UI copy for development-process terms and stale identifiers.
- Remove remaining phase-numbered globals from active code.
- Ensure no old deleted file is referenced by `index.html`.
- Ensure no admin workflow writes directly around the data access layer for sign-up, attendance, training, referrals, or notifications.
- Confirm queue pages show loaded records after refresh:
  - Opportunity sign-ups
  - Attendance claims
  - Training sign-ups
  - Referrals
  - Points ledger

### Phase 18 — Manual QA checklist and release readiness

Target:

- Add or update a manual QA checklist covering:
  - Admin sign-up queue load and search
  - Sign-up confirm/waitlist/decline actions
  - Attendance verify/reject/clarification actions
  - Volunteer clarification response flow
  - Training sign-up review
  - Referral review
  - Points ledger read-only review
  - Admin reports export
  - Audit search
  - Notifications history
- Record known required test users and sample data assumptions.
- Document deployment validation using query-string cache busting, for example `?v=<commit>`.

## Production/manual requirements still pending

Do not treat the app as production-complete until these are done:

1. Run the latest SQL validation checks.
2. Run the browser admin UI smoke script as a signed-in admin.
3. Run the manual QA checklist with separate volunteer and admin accounts.
4. Enable leaked-password protection in Supabase Auth console.
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

## Recent cleanup commit anchors

These commits are useful reference points for the cleanup sequence:

- `b992963` — removed phase-numbered volunteer action router.
- `56e51cc` — removed phase-numbered admin table module.
- `881afcc` — removed phase-numbered admin shell module.
- `db235c8` — removed phase-numbered admin pages module.
- `9f9fdd0` — removed phase-numbered drawer review actions module.

## Next recommended step

Proceed with **Phase 14 — Admin queue sync module rename**. Keep the queue refresh behavior primary and verify that sign-up and attendance queues still render current rows after the rename.
