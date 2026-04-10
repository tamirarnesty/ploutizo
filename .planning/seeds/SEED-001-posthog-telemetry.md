---
id: SEED-001
status: dormant
planted: 2026-04-10
planted_during: v0.1 MVP — Phase 03.2 (Transaction API)
trigger_when: Phase 5 (Bank Import) or any event-heavy phase is being planned
scope: Medium
---

# SEED-001: PostHog telemetry for analytics, logging, and error reporting across web, API, and DB

## Why This Matters

The app will have meaningful user behavior (imports, categorization rules, transaction edits)
and server-side processing (import batches, webhook handlers, Drizzle queries) that are
completely invisible without instrumentation. PostHog covers the full stack:
- Web: pageview/event tracking, funnel analysis, session replay
- API: request/response logging, error capture, latency histograms
- DB: slow query surfacing (complements Neon's built-in slow query log)

Without this, production issues are discovered by users rather than by us, and product
decisions (what features people actually use) are guesswork.

## When to Surface

**Trigger:** Phase 5 (Bank Import) planning or any milestone with high event volume

This seed should be presented during `/gsd-new-milestone` when the milestone
scope matches any of these conditions:
- Phase 5 (Bank Import) is being planned — imports generate high event volume per user action
- A new milestone with user-facing workflows is starting
- v0.1 is being shipped and pre-launch observability is being evaluated

## Scope Estimate

**Medium** — One phase covering:
1. PostHog JS SDK in `apps/web` — pageview autocapture, custom events, feature flags stub
2. PostHog Node SDK in `apps/api` — Hono middleware for request logging, error capture, identify
3. DB layer — wrap slow query logging; surface Neon's built-in metrics via PostHog custom events or keep separate
4. Error boundary in React for unhandled client errors → PostHog `capture('$exception')`

## Breadcrumbs

No existing telemetry references found in the codebase (clean slate).

Relevant integration points to examine when this surfaces:
- `apps/api/src/index.ts` — Hono app entry; add PostHog middleware here
- `apps/web/src/main.tsx` (or router entry) — PostHog JS init
- `apps/web/src/routes/__root.tsx` — React error boundary candidate
- `packages/db/src/index.ts` — Neon Pool construction; hook for query logging
- `apps/api/src/middleware/` — existing tenantGuard pattern to follow for new middleware

## Notes

- PostHog self-hosted vs. PostHog Cloud: Cloud is zero-ops for MVP; revisit self-host post-v1
- PostHog feature flags could replace any ad-hoc env var gates added during MVP phases
- Consider pairing with Sentry for structured error reporting if PostHog's error tooling feels thin
