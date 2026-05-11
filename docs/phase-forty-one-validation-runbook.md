# Phase 41 — Validation Runbook

Status: validation assets generated.

## Purpose

Phase 41 is a validation phase, not a feature phase. Its goal is to verify that the Phase 34–40 single admin interface is stable enough for manual QA and production-gate decisions.

The generated checks are non-destructive by default.

## Files added

```text
supabase/verification/phase41_validation_checks.sql
scripts/phase41-admin-ui-smoke.js
docs/phase-forty-one-validation-runbook.md
```

## Validation set

### 1. Supabase SQL validation

File:

```text
supabase/verification/phase41_validation_checks.sql
```

Run in:

```text
Supabase SQL Editor
```

or through a read-only SQL execution session.

Expected result:

```text
Every row should return status = pass
```

This checks:

- Phase 40 referral review RPC exists.
- Anonymous role cannot execute the referral review RPC.
- Authenticated role can call the RPC, while admin enforcement remains inside the function.
- Audit logging function exists.
- Referral tables exist and have RLS enabled.
- Referral status constraint exists.
- Session attendance validation RPC exists.
- Training session table exists.
- Points ledger exists.
- No obvious public/manual points adjustment RPC has been introduced.

Failure handling:

| Failed check | Meaning | Suggested response |
|---|---|---|
| `phase40_referral_rpc_exists` | Phase 40 migration was not applied | Apply `202605110011_phase_forty_referral_admin_workflow.sql` |
| `phase40_referral_rpc_not_anon_executable` | Anonymous users may execute referral review RPC | Revoke anonymous execute immediately |
| `audit_function_exists` | Referral review audit logging may fail | Confirm Phase 27 migration state |
| `app_referrals_rls_enabled` | Referral rows may be exposed incorrectly | Re-enable RLS and policies |
| `no_public_points_adjustment_rpc_detected` | A manual points adjustment RPC exists | Review policy/audit approval before use |

### 2. Browser admin UI smoke validation

File:

```text
scripts/phase41-admin-ui-smoke.js
```

Run steps:

1. Open the app in a browser.
2. Sign in as an admin.
3. Open DevTools Console.
4. Paste the whole script.
5. Press Enter.

Expected result:

```text
Phase 41 admin UI smoke validation passed.
```

The script checks:

- `VolunteerDataStore` exists.
- Current session is admin.
- Phase 34 shell module exists.
- Phase 35 canonical page module exists.
- Phase 36 table module exists.
- Phase 38/39/40 drawer action module exists.
- Phase 37 legacy surface retirement module exists.
- Referral and gamification modules exist.
- Admin workspace opens.
- All canonical admin areas render.
- Key admin pages show Phase 36 tables or empty states.
- A drawer opens from at least one row if seeded data exists.
- System / QA exposes Phase 37 retirement state.

Notes:

- This script does not click mutation/action buttons.
- If no seeded rows exist, drawer-row validation may fail with `No table rows found`. That is a data availability issue, not necessarily a UI regression.
- Run with seeded sign-up, attendance, training, referral, and points data for full coverage.

### 3. Manual drawer action QA

The browser smoke script intentionally does not mutate data. Use separate safe test records for manual action validation.

Minimum manual checks:

| Workflow | Test |
|---|---|
| Sign-ups | Confirm, waitlist, decline, reset pending on a safe test signup |
| Attendance | Verify with adjusted verified hours, request clarification, reject |
| Training | Mark completed, mark no-show, cancel, reset registered |
| Referrals | Mark converted, duplicate, cancelled, accepted |
| Audit | Confirm drawer actions create or preserve expected audit entries |
| Points | Confirm points rows remain read-only |

## Phase 41 pass criteria

Treat Phase 41 as passed only when:

1. `phase41_validation_checks.sql` returns all pass.
2. `phase41-admin-ui-smoke.js` returns pass or only data-seeding-related failures.
3. Manual drawer action QA passes with separate admin and volunteer accounts.
4. Fallback legacy tools remain reachable where drawer actions are not yet sufficient.
5. Supabase Auth settings are reviewed manually:
   - redirect URLs;
   - email templates;
   - leaked-password protection.
6. Security and performance advisors are reviewed after the latest migration.

## Production gate decisions

After validation, decide:

```text
Can fallback legacy tools be removed?
Should points adjustment be policy-approved?
Can Sveltia files be deleted?
Can legacy non-app tables be removed?
Are authenticated SECURITY DEFINER warnings acceptable or should they be remediated?
```

Do not proceed to deletion/removal until these decisions are explicit.

## Recommended next phase

If validation passes:

```text
Phase 42 — Legacy Fallback Removal Plan
```

If validation fails:

```text
Phase 41.1 — Validation Fixes
```
