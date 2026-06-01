# Phase 40 — Referral and Points Admin Workflows

Status: implemented for referral status workflow; points adjustment remains policy-gated and read-only.

## Purpose

Phase 40 completes the remaining admin workflow gap after Phase 39 by adding referral status management to the single admin interface.

The phase intentionally does **not** add unrestricted points adjustment. Points remain read-only until policy approval and stronger adjustment/audit requirements are confirmed.

## Files added / changed

```text
supabase/migrations/202605110011_phase_forty_referral_admin_workflow.sql
assets/referrals.js
assets/phase-thirty-eight-drawer-review-actions.js
docs/phase-forty-referral-points-admin-workflows.md
```

## Supabase changes

Added admin-only RPC:

```sql
public.review_app_referral_status(
  p_referral_id uuid,
  p_status text,
  p_admin_notes text default null
)
```

Allowed statuses:

```text
accepted
converted
cancelled
duplicate
```

The RPC:

- requires `current_app_user_is_admin()`;
- validates the requested status;
- locks the referral row before updating;
- stores review metadata in `app_referrals.metadata`;
- writes audit metadata through `record_app_audit_log(...)`;
- revokes public/anonymous execute;
- grants execute only to authenticated users, with admin enforcement inside the function.

Live verification performed:

```text
review_app_referral_status_anon_execute: pass
```

## Frontend changes

### Referral data exposure

`assets/referrals.js` now exposes referral data for the shared admin table layer through:

```js
window.MENDAKIReferrals.getAdminReferrals()
window.MENDAKIReferrals.getMyReferrals()
window.MENDAKIReferrals.sync()
```

It also installs `VolunteerDataStore` helpers:

```js
VolunteerDataStore.getReferrals()
VolunteerDataStore.getAdminReferrals()
VolunteerDataStore.getMyReferrals()
```

and emits:

```js
mendaki-referrals-synced
```

after sync.

### Referral drawer actions

Referral rows in the Phase 36 table now show drawer actions:

```text
Mark accepted
Mark converted
Mark duplicate
Cancel referral
```

These actions call:

```js
supabase.rpc('review_app_referral_status', ...)
```

with the selected referral ID, new status, and optional admin notes from the drawer.

### Refresh behavior

After a referral drawer action, the app refreshes:

- referrals;
- gamification summary without triggering award backfill;
- notifications where available;
- the active admin shell page.

## Points workflow decision

Points adjustment is intentionally **not** implemented in Phase 40.

Reason:

- points can affect recognition and reporting;
- manual adjustment needs policy approval;
- adjustment should be strongly audited;
- adjustment should ideally have reason codes, notes, actor, and source metadata;
- unrestricted frontend adjustment would be too risky for production readiness.

Current drawer behavior for points rows:

```text
Points adjustment is policy-gated and remains read-only in this phase.
```

## Current limitations

- Referral conversion semantics are still operationally simple: status changes only.
- No email notification is sent when referral status changes.
- Points are not automatically adjusted by referral status changes beyond existing points-award logic.
- Points adjustment remains deferred.
- Drawer actions still require manual QA with separate admin and volunteer accounts.

## Smoke checks

After signing in as admin:

1. Open Admin workspace.
2. Open Referrals.
3. Confirm referral table is populated when referral records exist.
4. Click a referral row.
5. Add an admin note.
6. Change status to converted, duplicate, cancelled, or accepted on a safe test record.
7. Confirm drawer shows success feedback and closes.
8. Confirm the table refreshes with the new status.
9. Open Audit and confirm a `referral.status_reviewed` audit entry appears where audit data is exposed.
10. Open Points and confirm points rows remain read-only.

## Next phase

Recommended next phase:

```text
Phase 41 — Manual QA and Production Gate Review
```

Purpose:

- stop adding feature/UI layers;
- run the full manual QA checklist;
- verify drawer actions with separate admin and volunteer accounts;
- re-run Phase 32, Phase 33, and Phase 40 checks;
- decide whether fallback legacy tools can be removed;
- decide whether points adjustment is policy-approved.
