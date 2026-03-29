---
phase: 01-foundation-auth-infrastructure
plan: 03
subsystem: api
tags: [hono, node, typescript, vitest, clerk, cors, middleware]

# Dependency graph
requires:
  - phase: 01-foundation-auth-infrastructure/01-01
    provides: "@ploutizo/types and @ploutizo/validators workspace packages"
  - phase: 01-foundation-auth-infrastructure/01-02
    provides: "@ploutizo/db workspace package"
provides:
  - "apps/api Hono Node.js application with correct middleware order skeleton"
  - "Health endpoint GET /health returning {data: {status: 'ok'}}"
  - "Middleware skeleton: CORS → clerkMiddleware → tenantGuard (scoped to /api/*)"
  - "tenantGuard stub using falsy !orgId check"
  - "isAllowedParty function for subdomain-aware azp validation (D-04)"
  - "Vitest configured for API unit tests"
affects:
  - "01-04: drops in full Clerk middleware and tenantGuard implementation"
  - "01-05: drops in webhook handler at /webhooks/clerk"

# Tech tracking
tech-stack:
  added:
    - "hono ^4.12.9"
    - "@hono/clerk-auth ^3.1.0"
    - "@hono/node-server ^1.19.11"
    - "neverthrow ^8.2.0"
    - "svix ^1.89.0"
    - "vitest ^4.1.2"
  patterns:
    - "Arrow functions only — no function keyword"
    - "Named exports only — no default exports on custom code"
    - "CORS before Clerk in middleware chain (invariant order)"
    - "tenantGuard scoped to /api/* only — never to /health or /webhooks"
    - "!orgId falsy check (not orgId === null) for tenant validation"

key-files:
  created:
    - "apps/api/package.json"
    - "apps/api/tsconfig.json"
    - "apps/api/vitest.config.ts"
    - "apps/api/.env.example"
    - "apps/api/src/index.ts"
    - "apps/api/src/routes/health.ts"
    - "apps/api/src/routes/webhooks.ts"
    - "apps/api/src/middleware/tenantGuard.ts"
    - "apps/api/src/__tests__/health.test.ts"
  modified: []

key-decisions:
  - "authorizedParties typed as string[] in @hono/clerk-auth — isAllowedParty function kept as exported utility for future app-layer subdomain validation; static list used for clerkMiddleware"
  - "Stub packages created for @ploutizo/db, @ploutizo/types, @ploutizo/validators to allow pnpm install in parallel wave 2 execution (will be overwritten by Plans 01-01 and 01-02)"

patterns-established:
  - "Middleware order invariant: cors() → clerkMiddleware() → tenantGuard() — never reorder"
  - "TDD: health test file created before implementation"

requirements-completed:
  - "apps/api: Hono Node.js app on port 8080 with CORS, health endpoint, correct middleware order skeleton"

# Metrics
duration: 6min
completed: 2026-03-29
---

# Phase 1 Plan 3: Hono API App Skeleton Summary

**Hono Node.js app with CORS → Clerk → tenantGuard middleware order skeleton, health endpoint, and Vitest configured**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-29T19:50:37Z
- **Completed:** 2026-03-29T19:57:06Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Created `apps/api` package with all Hono, Clerk, and Svix dependencies declared
- Health endpoint `GET /health` returns `{data: {status: 'ok'}}` with 200, Content-Type: application/json
- Correct middleware order established: `cors()` → `clerkMiddleware()` → `tenantGuard()` (scoped to `/api/*`)
- `tenantGuard` stub uses `!orgId` falsy check (not `orgId === null`) ready for Plan 04 implementation
- `isAllowedParty` function exported for subdomain regex validation (D-04 design decision)
- `clockSkewInMs: 10000` set on `clerkMiddleware` for Railway container clock drift
- All 2 health endpoint tests passing, typecheck clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Create apps/api package with Hono dependencies** - `6ae27bd` (chore)
2. **TDD RED: Failing health tests** - `19f5f38` (test)
3. **Task 2: Hono app entry point with health endpoint** - `4c25dcb` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD RED state committed separately before GREEN implementation_

## Files Created/Modified

- `apps/api/package.json` - Package with Hono, Clerk, Svix, neverthrow deps; no @ploutizo/ui
- `apps/api/tsconfig.json` - Strict TypeScript with bundler moduleResolution
- `apps/api/vitest.config.ts` - Vitest with node environment, includes src/**/*.test.ts
- `apps/api/.env.example` - Documents DATABASE_URL, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET (no VITE_ prefix)
- `apps/api/src/index.ts` - Hono app entry point with CORS → Clerk → tenantGuard middleware order
- `apps/api/src/routes/health.ts` - Health endpoint returning {data: {status: 'ok'}}
- `apps/api/src/routes/webhooks.ts` - Stub router for Plan 05 Clerk webhook handler
- `apps/api/src/middleware/tenantGuard.ts` - Stub guard using !orgId, scoped to /api/*
- `apps/api/src/__tests__/health.test.ts` - 2 tests: 200 status with body, JSON content-type

## Decisions Made

- **authorizedParties function vs string[]**: `@hono/clerk-auth` types `authorizedParties` as `string[]` only — function type unsupported. Kept `isAllowedParty` exported as utility function for future use; `clerkMiddleware` uses a static `string[]`. Document the D-04 intent via comments.
- **Stub workspace packages**: `@ploutizo/db`, `@ploutizo/types`, `@ploutizo/validators` don't exist in the worktree (parallel wave 2 execution). Created minimal stubs to allow `pnpm install --filter api` to succeed. These stubs will be overwritten by Plans 01-01 and 01-02.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed authorizedParties function type incompatibility**
- **Found during:** Task 2 (Hono app entry point)
- **Issue:** Plan called for `authorizedParties: isAllowedParty` (function) but `@hono/clerk-auth` types this as `string[] | undefined`. TypeScript error: `Type '(azp: string) => boolean' is not assignable to type 'string[]'`
- **Fix:** Exported `isAllowedParty` as utility function (satisfies `noUnusedLocals`), added static `authorizedParties: string[]` for `clerkMiddleware`. Regex subdomain validation preserved as exported function for app-layer use in Phase 2+.
- **Files modified:** `apps/api/src/index.ts`
- **Verification:** `tsc --noEmit` exits 0
- **Committed in:** `4c25dcb` (Task 2 commit)

**2. [Rule 3 - Blocking] Created stub workspace packages for parallel execution**
- **Found during:** Task 1 (`pnpm install --filter api`)
- **Issue:** `@ploutizo/db`, `@ploutizo/types`, `@ploutizo/validators` not yet in workspace (Plans 01-01 and 01-02 run in parallel wave 2). `pnpm install` fails with `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`.
- **Fix:** Created minimal stub `package.json` + `src/index.ts` for each package. Stubs export nothing and will be overwritten by the parallel plans.
- **Files modified:** `packages/db/package.json`, `packages/db/src/index.ts`, `packages/types/package.json`, `packages/types/src/index.ts`, `packages/validators/package.json`, `packages/validators/src/index.ts`
- **Verification:** `pnpm install --filter api` succeeds, tests pass
- **Committed in:** `4c25dcb` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking issue)
**Impact on plan:** Both fixes essential for correctness and build. No scope creep. Acceptance criteria fully satisfied.

## Known Stubs

- `apps/api/src/middleware/tenantGuard.ts` — stub implementation; only checks `!orgId`. Full Clerk `getAuth()` integration with proper typing in Plan 04.
- `apps/api/src/routes/webhooks.ts` — stub POST /clerk handler; full Svix signature verification in Plan 05.
- `packages/db/src/index.ts` — empty stub; replaced by Plan 01-02.
- `packages/types/src/index.ts` — empty stub; replaced by Plan 01-01.
- `packages/validators/src/index.ts` — empty stub; replaced by Plan 01-01.

These stubs are intentional for this plan's scope. Plans 01-01, 01-02, 01-04, and 01-05 resolve them.

## Issues Encountered

- `.env.example` file cannot be staged by `git add` within the sandbox environment (Operation not permitted — sandbox read-deny matches `**/.env.*` pattern). File was written successfully via the Write tool and is on disk, but could not be committed. Will be staged when sandbox restrictions allow.
- Turbo traversal also blocked by sandbox on `.env.example` — used direct `tsc --noEmit` for typecheck verification.

## Next Phase Readiness

- `apps/api` package exists with all dependencies installed and TypeScript compiling clean
- Health endpoint confirmed working via unit tests
- Middleware order skeleton established — Plan 04 drops in full `clerkMiddleware` options and real `tenantGuard` without restructuring
- Plan 05 drops in Svix webhook handler without restructuring
- No blockers for Plans 01-04 or 01-05

---
*Phase: 01-foundation-auth-infrastructure*
*Completed: 2026-03-29*
