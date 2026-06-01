# Product Intent

Last updated: 2026-06-02

## Product definition

The MENDAKI Volunteer Hub is a volunteer engagement hub for MENDAKI. It helps volunteers discover updates, understand available development pathways, interact with training and attendance support flows, and gives volunteer managers lightweight support tools for engagement, reporting, and operations.

The app is not the authoritative system for volunteer opportunity sign-ups. Volunteer opportunity sign-up creation, status lifecycle, capacity, waitlist, and final participation records belong to YM Hub/Salesforce.

## Source-of-truth boundary

### YM Hub/Salesforce owns

YM Hub/Salesforce is the production source of truth for volunteer opportunity sign-ups and related lifecycle records.

This includes:

- opportunity sign-up creation
- authoritative opportunity participation status
- final opportunity capacity decisions
- final waitlist decisions
- official Salesforce/YM Hub volunteer opportunity records
- any records that must be relied on for operational, compliance, or official reporting purposes

Volunteer opportunity calls to action in this app should redirect to YM Hub/Salesforce unless a future product decision explicitly changes this boundary and updates this document.

### Supabase is prototype infrastructure

Supabase is prototype/mock backend infrastructure in this repository. It is useful for pilots, UI development, internal demos, and feature exploration, but it is not the final authority for volunteer opportunity sign-ups.

Existing Supabase sign-up tables should be treated as prototype, legacy, or possible future read-only mirror structures. They must not be treated as the production source of truth unless MENDAKI explicitly approves a new architecture and this document is updated.

## What this app owns

This app may own and continue to develop the following engagement and support capabilities:

- volunteer news and updates
- training opportunity discovery and registration flows
- attendance check-in/check-out support
- attendance verification support interfaces
- gamification, achievements, and points experiences
- referral flows
- volunteer-manager support tools
- engagement dashboards and non-authoritative operational reporting
- UX surfaces that guide volunteers toward YM Hub/Salesforce for opportunity actions

Training registrations are intentionally separate from volunteer opportunity sign-ups. Training may remain in-app unless a future product decision moves it into YM Hub/Salesforce or another system of record.

## What this app does not own

This app does not own:

- authoritative volunteer opportunity sign-up creation
- authoritative volunteer opportunity sign-up lifecycle
- final volunteer opportunity capacity management
- final volunteer opportunity waitlist management
- Salesforce/YM Hub records
- official production reporting based on volunteer opportunity participation unless sourced from YM Hub/Salesforce or an approved integration

## Product boundary for opportunity CTAs

Volunteer-facing opportunity calls to action should route users to YM Hub/Salesforce for sign-up or official opportunity lifecycle action.

Do not restore in-app volunteer opportunity sign-up creation unless explicitly instructed by product ownership and accompanied by updates to:

- this document
- `docs/ai-development-guide.md`
- `docs/architecture.md`
- `README.md`
- any affected QA or phase documents

## Future integration direction

The target production architecture is to integrate with YM Hub/Salesforce for opportunity data and sign-up lifecycle status. The app may display opportunity information and user-facing engagement context, but authoritative opportunity actions should come from or write to YM Hub/Salesforce through an approved integration.

Possible future patterns include:

- redirect-only opportunity CTAs
- read-only display of Salesforce/YM Hub opportunity status
- approved API integration for displaying volunteer-specific opportunity lifecycle information
- read-only Supabase mirror tables fed from Salesforce/YM Hub for UI performance or reporting support

Any future write-back integration must be explicitly approved and documented before implementation.
