# AI Development Guide

Last updated: 2026-06-02

This guide is for AI agents and AI-assisted developers working in this repository.

Before planning feature work, read `docs/product-intent.md`. Treat that file as the product boundary source for this repo.

## Core product boundary

The MENDAKI Volunteer Hub is a volunteer engagement hub. It is not the production system of record for volunteer opportunity sign-ups.

YM Hub/Salesforce owns volunteer opportunity sign-ups, opportunity lifecycle state, final capacity decisions, final waitlist decisions, and authoritative volunteer opportunity records.

Supabase is prototype/mock backend infrastructure unless a human maintainer explicitly says otherwise and updates the product-intent documentation.

## Rules for AI-assisted development

Do not reintroduce in-app volunteer opportunity sign-up creation unless explicitly instructed. This includes modal sign-up creation, localStorage sign-up creation, Supabase sign-up creation, or any fallback path that creates a volunteer opportunity sign-up inside this app.

Do not treat Supabase opportunity sign-ups as the production source of truth. Existing `app_opportunity_signups` structures are prototype, legacy, or possible future read-only mirror structures.

Preserve YM Hub/Salesforce redirect behavior for volunteer opportunity calls to action. Opportunity CTAs should guide volunteers to the authoritative system unless the product boundary is deliberately changed.

Treat Supabase as a prototype/mock backend by default. Do not make architectural claims that Supabase is the final production authority for opportunity sign-ups.

Do not introduce fallback, local-only, demo, or mock behavior unless explicitly requested. If a fallback already exists, avoid expanding it without product approval.

Prefer documentation updates when product intent changes. Update docs in the same change as behavior changes.

## Opportunity sign-ups versus training registrations

Distinguish volunteer opportunity sign-ups from training registrations.

Volunteer opportunity sign-ups:

- are owned by YM Hub/Salesforce
- should not be created in-app
- should not use Supabase as the production authority
- should preserve redirect behavior for official action

Training registrations:

- may remain in this app
- may use in-app registration flows
- may use Supabase prototype infrastructure during pilot development
- should remain separate from opportunity sign-up lifecycle assumptions

Do not copy opportunity sign-up restrictions onto training unless the product-intent docs are updated to say training has moved to another source of truth.

## Capabilities that remain in scope for this app

Unless `docs/product-intent.md` says otherwise, keep the following inside this app:

- training discovery and registration
- attendance check-in/check-out support
- attendance verification support
- referrals
- gamification, points, and achievements
- volunteer news and updates
- volunteer-manager support tools
- engagement dashboards
- non-authoritative reporting

## Architecture guidance

When changing architecture or persistence behavior:

1. Check `docs/product-intent.md` first.
2. Check `docs/architecture.md` for the current implementation boundary.
3. Avoid direct product assumptions from old phase documents.
4. Treat old phase documents as historical unless they have been explicitly refreshed.
5. Update documentation if implementation behavior changes.

## Documentation update checklist

When product intent or ownership changes, update:

- `docs/product-intent.md`
- `docs/ai-development-guide.md`
- `docs/architecture.md`
- `README.md`
- relevant QA checklists
- relevant phase documents, especially if they describe superseded prototype behavior

## Common mistakes to avoid

Do not restore old buttons or handlers that create opportunity sign-ups in localStorage or Supabase.

Do not describe `app_opportunity_signups` as canonical production data.

Do not add capacity or waitlist logic that implies this app makes final opportunity participation decisions.

Do not infer that because training registrations are in-app, opportunity sign-ups should also be in-app.

Do not rely on old phase docs without checking the current product boundary.

Do not silently preserve or add demo behavior where production behavior should fail explicitly or redirect to YM Hub/Salesforce.
