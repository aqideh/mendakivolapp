# Phase 23 — Auth completion

This phase completes the core Supabase Auth flows needed before referrals, gamification, and production pilot onboarding.

## Implemented

### Account creation

The auth modal supports:

- sign in;
- create account;
- reset password;
- set new password after a recovery redirect.

Create-account mode calls Supabase Auth `signUp(...)` with:

- email;
- password;
- full name in user metadata;
- configured redirect URL.

If email confirmation is required, the UI tells the volunteer to verify their email and then sign in.

If Supabase immediately returns a session, the user is refreshed and sent to the dashboard.

### App user creation after redirects

`VolunteerDataStore.refreshSupabaseSession()` now calls `ensureAppUser(...)`, not only `fetchAppUser(...)`.

This means users who arrive after email confirmation or password recovery are guaranteed to get an `app_users` row when possible.

### Password reset

Reset mode calls:

```js
supabase.auth.resetPasswordForEmail(email, { redirectTo })
```

When Supabase returns with a recovery session, the modal switches into `update` mode and calls:

```js
supabase.auth.updateUser({ password })
```

After a successful update, the user is refreshed and routed to the dashboard.

## Files changed

- `assets/data-store.js`
- `assets/auth-password-field.js`

## Supabase configuration required

In Supabase Auth settings, confirm:

1. Email/password signups are enabled.
2. The site URL matches the deployed app URL.
3. Redirect URLs include the deployed app URL.
4. Email confirmation policy is set intentionally:
   - enabled for production;
   - optionally disabled only for local testing.
5. Password recovery email template links back to the app URL.

## Manual QA checklist

### Sign in

1. Open the auth modal.
2. Use Sign in mode.
3. Sign in with an existing Supabase user.
4. Confirm the dashboard opens.
5. Confirm `app_users` has a row for the auth user.

### Create account

1. Open Create account mode.
2. Enter full name, email, and password of at least 8 characters.
3. Submit.
4. If confirmation is enabled, confirm the UI says to check email.
5. Click the verification link.
6. Confirm sign-in works.
7. Confirm `app_users` row is created with role `volunteer`.

### Reset password

1. Open Reset password mode.
2. Enter an existing account email.
3. Submit.
4. Click the reset link from email.
5. Confirm the modal opens in Set new password mode.
6. Enter a new password of at least 8 characters.
7. Confirm the user lands on Dashboard.
8. Sign out and sign in with the new password.

## Current limitations

- There is no password confirmation field yet. The minimum length guard is implemented, but typo prevention can be improved.
- Auth email templates are managed in Supabase, not in this repo.
- Production roles still depend on the `app_users.role` value; new accounts default to `volunteer`.
