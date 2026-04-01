---
phase: 01-foundation-auth-infrastructure
plan: 06
subsystem: deployment, auth-routes, env-config
tags: [railway, tailwind-v4, bundle-audit, clerk, env, sign-in-or-up]
dependency_graph:
  requires: [01-04, 01-05]
  provides: [railway-deploy, env-examples, sign-in-or-up-route]
  affects: [deployment-pipeline, auth-flow, browser-bundle-isolation]
tech_stack:
  added: []
  patterns: [per-service-railway-toml, sign-in-or-up-single-route, clerk-env-var-auto-read]
key_files:
  created:
    - apps/api/railway.toml
    - apps/web/railway.toml
    - apps/api/.env.example
    - apps/web/.env.example
  modified:
    - apps/web/src/routes/__root.tsx
    - apps/web/src/routes/sign-in.$.tsx
    - packages/ui/src/styles/globals.css
decisions:
  - "Per-service railway.toml files (apps/api, apps/web) instead of a single root file — Railway per-service configs are the correct approach for monorepos"
  - "Single sign-in-or-up route (sign-in.$.tsx with <SignIn />) instead of separate sign-in + sign-up routes — Clerk handles both flows within one component"
  - "CLERK_SIGN_IN_URL and CLERK_SIGN_UP_URL read from env vars by Clerk SDK automatically — removed hardcoded props from ClerkProvider"
  - "signUpUrl set to /sign-in in env — sign-up flow handled within the same <SignIn /> component"
metrics:
  duration: "manual"
  completed: "2026-03-31"
  tasks_completed: 2
  files_created: 4
  files_modified: 3
---

# Phase 1 Plan 6: Railway Deploy, Bundle Audit & Auth Route Cleanup

**One-liner:** Live Railway deployment with per-service configs and pre-deploy migration, bundle audit clean, and Clerk sign-in-or-up consolidated to a single route driven by env vars.

## Tasks Completed

| # | Name | Commits | Files |
|---|------|---------|-------|
| 1 | Per-service railway.toml, Tailwind v4 audit, env.example files | d02b5c9, 2ce0eba | apps/api/railway.toml (new), apps/web/railway.toml (new), apps/api/.env.example (new), apps/web/.env.example (new), packages/ui/src/styles/globals.css (updated) |
| 2 | Sign-in-or-up route consolidation + ClerkProvider cleanup | 5a604a0 | apps/web/src/routes/__root.tsx (updated), apps/web/src/routes/sign-in.$.tsx (existing) |

## What Was Built

### Railway Deployment (Task 1)

`apps/api/railway.toml` — RAILPACK builder, `preDeployCommand = ["pnpm db:migrate"]`, health check at `/health`, restart on failure. Watch patterns scope rebuilds to api + shared packages only.

`apps/web/railway.toml` — RAILPACK builder, `startCommand = "node apps/web/.output/server/index.mjs"`, matching watch patterns for web + UI packages.

Both services deployed to `us-east4-eqdc4a` with 1 replica each. Pre-deploy migration confirmed running in Railway logs. `GET https://api.ploutizo.app/health` returns `{"data":{"status":"ok"}}` with HTTP 200.

### Tailwind v4 Audit (Task 1)

`packages/ui/src/styles/globals.css` — Audit complete: existing `button.tsx` already uses correct v4 patterns (`border-border`, `ring-ring`, `ring-3`). Added D-07 compliance comment block at top of globals.css documenting the rule for future component authors.

### Env Documentation (Task 1)

`apps/api/.env.example` — Documents `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`, `PORT`. All without `VITE_` prefix (server-only vars).

`apps/web/.env.example` — Documents `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL`, `CLERK_SIGN_IN_URL`, `CLERK_SIGN_UP_URL`. Includes commented satellite domain config for future `{slug}.ploutizo.app` deployments.

### Sign-In-or-Up Route (Task 2)

`sign-in.$.tsx` — Single catch-all route at `/sign-in/$` using Clerk's `<SignIn />` component. The `$` splat handles all Clerk sub-routes (`/sign-in/factor-one`, `/sign-in/sso-callback`, etc.). Sign-up flow is handled inline by the same component.

`__root.tsx` — Removed hardcoded `signInUrl` and `signUpUrl` props from `ClerkProvider`. Clerk's TanStack Start SDK auto-reads `CLERK_SIGN_IN_URL` and `CLERK_SIGN_UP_URL` from env vars (`utils/env.js: getValue("CLERK_SIGN_IN_URL")`). `beforeLoad` auth bypass simplified to `startsWith("/sign-in")` only.

## Verification Results

- `GET https://api.ploutizo.app/health` → HTTP 200 `{"data":{"status":"ok"}}`
- `pnpm db:migrate` confirmed in Railway pre-deploy logs
- `pnpm build --filter web` exits 0
- Bundle audit: zero matches for `DATABASE_URL`, `CLERK_SECRET_KEY`, `sk_live_` in `apps/web/.output/public/` (client bundle)
- Server bundle matches are safe: Clerk SDK reading env var at runtime, `"sk_test_"` prefix check string in Clerk internals, error message string — no embedded secret values

## Deviations from Plan

**Root railway.toml not created** — Plan called for a single root `railway.toml`. Per-service files (`apps/api/railway.toml`, `apps/web/railway.toml`) are the correct Railway monorepo pattern and are what the live deployment uses.

**Separate sign-up route not created** — Plan assumed separate `sign-in.$.tsx` and `sign-up.$.tsx`. Replaced with a single sign-in-or-up route per Clerk's official TanStack Start guide.

## Known Stubs

None — Phase 1 definition of done fully met.

## Self-Check: PASSED
