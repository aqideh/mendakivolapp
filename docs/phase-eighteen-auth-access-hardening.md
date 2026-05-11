# Phase 18A — Auth and production access hardening

This phase starts the revised roadmap that was accepted after the expansion branch audit. It focuses on closing the highest-priority access gaps before deeper audit logging, session modelling, referrals, gamification, reporting, and production readiness work.

## Scope implemented

- Added a progressive Supabase auth controller to the existing account modal.
- Added three account modes:
  - Sign in
  - Create account
  - Reset password
- Added full-name capture for account creation.
- Added password reset email flow through Supabase Auth.
- Preserved local demo sign-in when Supabase is not configured.
- Kept new Supabase accounts on the default `volunteer` role. Admin and super-admin roles must still be provisioned through trusted backend/database administration, not from the public UI.

## Important behaviour

When Supabase is configured, the modal now handles account creation through `supabase.auth.signUp`. If email verification is required by the Supabase project, the user is told to verify their email before signing in.

When a newly created or existing Supabase user has an active session, the existing `VolunteerDataStore.refreshSupabaseSession` / `ensureAppUser` path remains responsible for creating the matching `app_users` row with role `volunteer`.

Password reset uses `supabase.auth.resetPasswordForEmail` and the configured `authRedirectTo` value from `assets/supabase-config.js`.

## Manual QA checklist

1. Open the auth modal while signed out.
2. Confirm the modal has Sign in, Create account, and Reset password modes.
3. In Create account mode:
   - full name is required;
   - password is required;
   - password must be at least 8 characters;
   - successful submission either signs the user in or shows an email verification message.
4. In Reset password mode:
   - only email is required;
   - successful submission shows a non-enumerating reset message.
5. In Sign in mode:
   - existing email/password sign-in still works;
   - successful sign-in routes to Dashboard;
   - admin access still comes from `app_users.role` in Supabase mode.
6. With Supabase config disabled or placeholder values, local demo sign-in still works.

## Follow-on work

Next recommended work remains:

1. Phase 18B — Authoritative Supabase write path cleanup.
2. Phase 18C — Server-side audit logging for high-impact actions.
3. Phase 19 — Proper `app_opportunity_sessions` session model.
4. Phase 20 — Waitlist promotion automation.
5. Phase 21 — Referral system.
6. Phase 22 — Gamification ledger.
