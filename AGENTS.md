# Agent Instructions

This repository is for the MENDAKI Volunteer Hub. Read these files before planning product or architecture changes:

- `docs/product-intent.md`
- `docs/ai-development-guide.md`
- `docs/architecture.md`

## Do not violate these rules

Opportunity sign-ups are not owned by this app. Do not build or restore in-app opportunity sign-up creation unless explicitly instructed. Volunteer opportunity CTAs should route to YM Hub/Salesforce. Supabase sign-up tables are prototype/legacy only.

Supabase is prototype infrastructure for this repo. Do not treat Supabase opportunity sign-up records as the production source of truth.

Do not introduce fallback, local-only, mock, or demo behavior unless explicitly requested. Existing prototype/demo paths may be documented, but new product behavior should be explicit and intentional.

When behavior or product ownership changes, update the documentation in the same change. Start with `docs/product-intent.md`, then update `docs/ai-development-guide.md`, `docs/architecture.md`, and the README where relevant.

Distinguish volunteer opportunity sign-ups from training registrations. YM Hub/Salesforce owns opportunity sign-ups. This app may continue to own training registrations, attendance check-in support, referrals, gamification, news, reporting, and volunteer-manager support tools unless the product-intent docs say otherwise.
