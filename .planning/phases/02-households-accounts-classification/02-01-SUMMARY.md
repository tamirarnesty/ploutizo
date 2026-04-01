---
phase: 02-households-accounts-classification
plan: 01
subsystem: api, database
tags: [drizzle-orm, hono, zod, postgres, accounts, households]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "orgs table, orgMembers table, tenantGuard middleware, Hono app with /api/* protection"
provides:
  - "accounts + account_members Drizzle tables with migration"
  - "accountsRouter with GET/POST/PATCH/DELETE(archive) endpoints"
  - "householdsRouter with GET/PATCH /settings endpoints"
  - "createAccountSchema, updateAccountSchema, updateHouseholdSettingsSchema Zod validators"
  - "Account, AccountMember, HouseholdSettings, OrgMember TypeScript interfaces"
affects:
  - 02-02-accounts-ui
  - 03-transactions
  - 04-settlement

# Tech tracking
tech-stack:
  added:
    - "drizzle-orm direct dependency in apps/api (previously transitive only)"
  patterns:
    - "TDD route tests: vi.mock('@ploutizo/db') + vi.mock('@ploutizo/db/schema') for unit tests without DB"
    - "Hono route pattern: getAuth(c).orgId! (tenantGuard guarantees truthy)"
    - "Validation error shape: { error: { code: 'VALIDATION_ERROR', errors: ZodIssue[] } } 400"
    - "Not-found shape: { error: { code: 'NOT_FOUND', message: '...' } } 404"
    - "Archive pattern: DELETE /:id/archive sets archivedAt = NOW()"

key-files:
  created:
    - packages/db/src/schema/accounts.ts
    - packages/db/drizzle/0001_remarkable_callisto.sql
    - packages/validators/src/index.ts
    - packages/validators/src/index.test.ts
    - packages/types/src/index.ts
    - apps/api/src/routes/accounts.ts
    - apps/api/src/routes/households.ts
    - apps/api/src/__tests__/accounts.test.ts
    - apps/api/src/__tests__/households.test.ts
  modified:
    - packages/db/src/schema/auth.ts
    - packages/db/src/schema/index.ts
    - apps/api/src/index.ts
    - apps/api/package.json

key-decisions:
  - "drizzle-orm added as direct dep to apps/api (was transitive only — imports failed in tests)"
  - "accountMembers replace-on-update pattern: delete all then re-insert when memberIds provided"
  - "accounts.updatedAt set explicitly in update/archive handlers (not relying on DB trigger)"

patterns-established:
  - "Route unit test pattern: vi.mock('@ploutizo/db') with fluent chain mocks returning arrays"
  - "Org-scoped query pattern: always filter by orgId from getAuth(c) — never trust request params"
  - "Transaction pattern: db.transaction(tx => ...) for multi-table writes (insert account + members)"

requirements-completed:
  - "§1 Households & Users"
  - "§2 Accounts"

# Metrics
duration: 6min
completed: 2026-04-01
---

# Phase 02 Plan 01: Accounts & Households API Summary

**accounts + account_members Drizzle schema, Zod validators, TypeScript types, and Hono CRUD routes for accounts and household settings with 36 passing unit tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-01T17:39:59Z
- **Completed:** 2026-04-01T17:46:19Z
- **Tasks:** 2 of 2
- **Files modified:** 13

## Accomplishments

- Defined `accounts` and `account_members` tables with proper org-scoped FK chains and indexes; generated migration `0001_remarkable_callisto.sql` adding both tables plus `orgs.updated_at`
- Populated `@ploutizo/validators` with createAccountSchema, updateAccountSchema, updateHouseholdSettingsSchema (zod ^3) and `@ploutizo/types` with Account, AccountMember, HouseholdSettings, OrgMember
- Built accountsRouter (GET, POST, PATCH, DELETE/archive) and householdsRouter (GET/PATCH /settings) mounted in index.ts after tenant guard; all 36 tests (21 validator + 15 API) pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Accounts DB schema + validators + types** - `6cc802b` (feat)
2. **Task 2: Accounts + households Hono routes with tests** - `773feda` (feat)

**Plan metadata:** _(created next — final docs commit)_

_Note: TDD tasks had RED tests first, then GREEN implementation_

## Files Created/Modified

- `packages/db/src/schema/accounts.ts` - accounts + account_members Drizzle table definitions
- `packages/db/src/schema/auth.ts` - added updatedAt column to orgs table
- `packages/db/src/schema/index.ts` - added `export * from './accounts.js'`
- `packages/db/drizzle/0001_remarkable_callisto.sql` - migration for accounts, account_members, orgs.updated_at
- `packages/validators/src/index.ts` - createAccountSchema, updateAccountSchema, updateHouseholdSettingsSchema
- `packages/validators/src/index.test.ts` - 21 unit tests for all validator schemas
- `packages/types/src/index.ts` - Account, AccountMember, HouseholdSettings, OrgMember interfaces
- `apps/api/src/routes/accounts.ts` - accountsRouter with GET / POST / PATCH /:id / DELETE /:id/archive
- `apps/api/src/routes/households.ts` - householdsRouter with GET /settings / PATCH /settings
- `apps/api/src/__tests__/accounts.test.ts` - 8 route unit tests
- `apps/api/src/__tests__/households.test.ts` - 4 route unit tests
- `apps/api/src/index.ts` - mounted accountsRouter and householdsRouter
- `apps/api/package.json` - added drizzle-orm direct dependency

## Decisions Made

- Added `drizzle-orm` as a direct dependency of `apps/api` — it was previously only a transitive dep from `@ploutizo/db`, causing "Cannot find package" errors in tests (auto-fixed Rule 3)
- Used replace-on-update strategy for accountMembers: delete all existing then re-insert when memberIds is provided in PATCH requests
- Set `updatedAt` explicitly in route handlers (not using DB triggers) to stay consistent with Drizzle pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added drizzle-orm as direct api dependency**
- **Found during:** Task 2 (accounts + households routes)
- **Issue:** Routes import `{ eq, and, isNull }` directly from `drizzle-orm`, but it was only a transitive dependency; Vitest could not resolve the package, failing all new route tests
- **Fix:** Added `"drizzle-orm": "^0.45.2"` to `apps/api/package.json` dependencies and ran `pnpm install`
- **Files modified:** `apps/api/package.json`, `pnpm-lock.yaml`
- **Verification:** All 4 API test files pass (15 tests)
- **Committed in:** `773feda` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for correctness — direct imports require direct dependency declaration. No scope creep.

## Issues Encountered

None beyond the drizzle-orm dependency auto-fix.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Accounts API surface fully built and tested; Plan 02 (accounts UI) can consume `/api/accounts` and `/api/households/settings`
- DB migration `0001_remarkable_callisto.sql` needs to be applied to Neon before any accounts API calls are made in production
- TypeScript types and Zod validators are available in `@ploutizo/types` and `@ploutizo/validators` for use in `apps/web`

---
*Phase: 02-households-accounts-classification*
*Completed: 2026-04-01*
