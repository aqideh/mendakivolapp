# Phase 33 — Production Readiness

Status: implemented as production-readiness groundwork after Phase 32.

## Purpose

Phase 33 prepares the pilot/beta app for safer production operation. It does not claim the app is production-complete. It adds low-risk hardening, verification SQL, and an operational runbook.

## Files added

```text
supabase/migrations/202605110010_phase_thirty_three_low_risk_production_hardening.sql
supabase/verification/phase33_production_readiness_checks.sql
docs/phase-thirty-three-production-readiness.md
```

## Database hardening applied

### Helper function search paths

The following functions were recreated with explicit `search_path = public`:

```text
report_date_in_range(...)
make_referral_code(...)
notification_category_for_type(...)
```

This addresses the mutable search-path advisor warnings for those helpers.

### Anonymous role-helper execution revoked

Anonymous direct execution was revoked for:

```text
current_app_role()
current_app_user_id()
current_app_user_is_admin()
```

The functions remain available to authenticated users and remain usable inside RLS policies / server-side functions.

### Live app-table FK indexes added

Added indexes for performance advisor warnings on live app tables:

```text
idx_app_audit_logs_target_user_id
idx_app_opportunity_signups_volunteer_user_id
idx_app_points_ledger_awarded_by
idx_app_training_signups_volunteer_user_id
idx_app_user_achievements_achievement_id
```

### Duplicate audit indexes removed

Dropped only the clear duplicate audit-log indexes:

```text
idx_app_audit_logs_actor
idx_app_audit_logs_created_at
```

Kept the canonical `app_*` audit indexes.

## Verification SQL

Run:

```text
supabase/verification/phase33_production_readiness_checks.sql
```

Expected results:

- `phase29_5_anon_rpc_grants`: pass, 0.
- `role_helpers_anon_executable`: pass, 0.
- `mutable_search_path_helpers`: pass, 0.
- `phase33_live_fk_indexes_missing`: pass, 0.
- `duplicate_audit_indexes_remaining`: pass, 0.
- `phase32_reference_integrity`: pass, 0.

## Production configuration checklist

### Supabase Auth redirects

Verify in Supabase Dashboard → Authentication → URL Configuration:

- Site URL should match the production GitHub Pages URL:

```text
https://aqideh.github.io/mendakivolapp/
```

- Additional redirect URLs should include local/dev URLs used for testing, for example:

```text
http://localhost:8000/
http://127.0.0.1:8000/
```

If a staging/preview deployment is introduced later, add that URL explicitly.

### Email templates

Verify Supabase Auth email templates for:

- confirmation;
- magic link / OTP if used;
- password reset;
- email change.

Templates should use MENDAKI Volunteer Hub wording and should not mention demo/admin shortcuts.

### Password security

Supabase advisor still reports leaked password protection as disabled. Enable it in Supabase Dashboard → Authentication → Providers / Password security when ready.

This is a console setting, not a SQL migration.

### Publishable key and frontend config

`assets/supabase-config.js` should continue to use:

```text
https://xyrcdukmubctqddgkfsi.supabase.co
```

and an enabled publishable/anon key for the project.

Do not commit service-role keys or any private keys.

## Deployment checklist

Before any production-facing demo or handoff:

1. Confirm `expansion` contains the intended commits.
2. Run Phase 32 smoke SQL.
3. Run Phase 33 production-readiness SQL.
4. Run the in-app QA smoke panel as admin.
5. Manually sign in as volunteer and admin.
6. Test opportunity session signup.
7. Test session-aware attendance check-in/out.
8. Test training session selection and signup.
9. Test admin training session creation/edit.
10. Test reports and CSV export.
11. Test audit history.
12. Test notifications.
13. Confirm Auth redirect returns to the expected deployed URL.
14. Confirm browser console has no critical runtime errors.

## Backup and restore guidance

Before major releases or data migrations:

- Take a Supabase backup/snapshot according to the project plan.
- Export critical pilot data if the plan does not include PITR.
- At minimum, export:
  - `app_users`;
  - `app_opportunities`;
  - `app_opportunity_sessions`;
  - `app_opportunity_signups`;
  - `app_attendance_claims`;
  - `app_training_sessions`;
  - `app_training_signups`;
  - `app_referrals`;
  - `app_points_ledger`;
  - `app_notifications`;
  - `app_audit_logs`.

Restore testing should be done in a separate project/branch, not directly over the pilot database.

## Export and data retention notes

Current CSV export is browser-based and suitable for pilot-scale data. Before production-scale usage:

- add pagination or server-side export for large reports;
- define a maximum export date range;
- define who may export reports;
- define how exported CSV files should be stored or deleted;
- define retention windows for audit logs, notifications, attendance claims, referrals, and points history.

Suggested default retention posture for policy review:

```text
Audit logs: retain at least 24 months
Attendance/verified hours: retain according to programme reporting requirements
Notifications: allow user/admin cleanup, keep audit-significant events in audit logs
CSV exports: user-managed files, not stored by the app
```

## Remaining advisor items

### Security definer functions callable by authenticated users

Many RPCs remain `SECURITY DEFINER` and executable by `authenticated`. This is intentional for current static-app architecture where RPCs enforce ownership/admin checks internally.

Before full production, review each RPC and classify:

- keep public authenticated RPC with internal ownership checks;
- make admin-only via stricter grants or edge/backend path;
- convert to `SECURITY INVOKER`;
- remove from exposed API schema.

### Legacy non-`app_*` tables

Advisor still reports RLS enabled with no policies on legacy tables such as:

```text
attendance_claims
opportunities
opportunity_sessions
opportunity_signups
testimonial_requests
training_signups
trainings
volunteer_profiles
```

These appear to be legacy/non-current schema. Do not delete them blindly. Before removal:

1. Confirm no frontend code uses them.
2. Confirm no migration/report/audit function depends on them.
3. Export data if any useful records exist.
4. Drop or archive in a dedicated cleanup migration.

### Security-definer view

Advisor still reports:

```text
volunteer_verified_hour_totals
```

as a security-definer view. Review whether it is used. If not used, drop it in a dedicated cleanup migration. If used, recreate it without security-definer semantics where possible.

### RLS initplan and multiple-permissive-policy lints

These should be cleaned when the app’s role model settles. They are performance/scalability work, not immediate pilot blockers after the Phase 33 low-risk fixes.

### Unused indexes

Unused-index advisor findings are not automatically safe to drop because the app is still pilot-scale. Re-evaluate after realistic usage.

## Legacy Sveltia files

Legacy Sveltia files remain planned for deletion after manual QA confirmation:

```text
admin/index.html
admin/config.yml
```

Do not delete them until the current admin workspace has passed manual QA and the team confirms Sveltia rollback is no longer needed.

## Handoff status

After Phase 33:

- Low-risk advisor fixes are applied.
- Production checklist exists.
- Backup/restore guidance exists.
- Export/data-retention guidance exists.
- Remaining advisor items are documented and scoped.
- The app remains pilot/beta until manual QA, Auth console settings, and policy decisions are completed.
