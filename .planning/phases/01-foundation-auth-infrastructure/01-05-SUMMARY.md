---
phase: 01-foundation-auth-infrastructure
plan: 05
subsystem: db-seeds, api-webhooks
tags: [seeds, schema, webhook, clerk, tenant-isolation]
dependency_graph:
  requires: [01-02, 01-03]
  provides: [seedOrg, seedOrgCategories, seedOrgMerchantRules, clerk-webhook-handler]
  affects: [org-creation-flow, category-seeding, merchant-rule-seeding]
tech_stack:
  added: [svix]
  patterns: [tenant-scoped-seeds, webhook-signature-verification, tdd-unit-mocks]
key_files:
  created:
    - packages/db/src/schema/auth.ts
    - packages/db/src/schema/classification.ts
    - packages/db/src/seeds/categories.ts
    - packages/db/src/seeds/merchantRules.ts
    - packages/db/src/seeds/index.ts
    - packages/db/src/__tests__/seeds.test.ts
  modified:
    - packages/db/src/schema/index.ts
    - apps/api/src/routes/webhooks.ts
decisions:
  - "Used schema field names (pattern, renameTo) in seed data — not plan's matchValue/renameDescription aliases"
  - "Mock type assertions in tests use unknown intermediate cast to satisfy Drizzle's strict PgInsertBuilder types"
  - "clearAllMocks() added inline in seedOrg test to prevent cross-test insert call count pollution"
metrics:
  duration: "344s"
  completed: "2026-03-29"
  tasks_completed: 2
  files_created: 6
  files_modified: 2
---

# Phase 1 Plan 5: Org Seed Scripts and Clerk Webhook Summary

**One-liner:** Tenant-scoped seed functions (11 categories, 5 merchant rules) with svix-verified Clerk webhook calling seedOrg on organization.created.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create schema stubs for categories and merchant rules | 89c15e5 | packages/db/src/schema/auth.ts (new), packages/db/src/schema/classification.ts (new), packages/db/src/schema/index.ts (updated) |
| 2 | Implement seed functions and Clerk webhook handler | d82999a | packages/db/src/seeds/{categories,merchantRules,index}.ts (new), packages/db/src/__tests__/seeds.test.ts (new), apps/api/src/routes/webhooks.ts (updated) |

## What Was Built

### Schema (Task 1)

`auth.ts` — Verbatim copy of old-artifacts/auth.ts with ESM `.js` import extension fixes. Exports: `users` (with `externalId`, not `clerkId`), `orgs`, `orgMembers`, `invitations`. All `orgId` columns are `.notNull()`.

`classification.ts` — Verbatim copy of old-artifacts/classification.ts with ESM `.js` import extension fixes. Exports: `categories`, `tags`, `merchantRules`, `merchantRuleTags`. Key invariants: `orgId` is `.notNull()` on categories, tags, and merchantRules; `merchantRules` uses `merchantMatchTypeEnum` (pgEnum) for `matchType`; column names are `pattern` and `renameTo`.

`schema/index.ts` — Updated to export Phase 1 tables only: `enums.js`, `auth.js`, `classification.js`. Does not export Phase 2+ tables.

### Seed Functions (Task 2)

`seeds/categories.ts` — `seedOrgCategories(orgId)` inserts 11 default categories (Groceries, Dining & Restaurants, Transportation, Housing & Rent, Utilities, Healthcare, Entertainment, Shopping, Travel, Personal Care, Other) all with Lucide icon names and ascending sortOrder. Every row has non-nullable `orgId` set to the argument.

`seeds/merchantRules.ts` — `seedOrgMerchantRules(orgId)` inserts 5 default merchant rules (Tim Hortons, Starbucks, Amazon, Netflix, Spotify) using `pattern` and `renameTo` schema fields. Every row has non-nullable `orgId`.

`seeds/index.ts` — `seedOrg(orgId)` wrapper calling both seed functions sequentially. Exported alongside individual seed functions.

`__tests__/seeds.test.ts` — Unit tests (TDD) covering: `seedOrgCategories` calls db.insert, all rows have provided orgId; `seedOrgMerchantRules` all rows have provided orgId; `seedOrg` calls db.insert exactly twice. Mock uses `unknown` intermediate cast for Drizzle strict types.

### Webhook Handler (Task 2)

`apps/api/src/routes/webhooks.ts` — Full Clerk webhook handler replacing stub:
- svix `Webhook.verify()` for signature verification
- Returns 500 if `CLERK_WEBHOOK_SECRET` missing
- Returns 400 on invalid signature
- On `organization.created`: calls `seedOrg(event.data.id)`
- Returns `{ data: { received: true } }` on success
- `tenantGuard` NOT applied (no JWT on webhook requests)

## Verification Results

- `pnpm test --filter @ploutizo/db`: 6/6 tests pass (2 test files)
- `pnpm typecheck`: exits 0 across workspace (6 packages)
- No `orgId: null` or `orgId: undefined` in seed files
- `organization.created` present in webhooks.ts
- `seedOrg(event.data.id)` present in webhooks.ts
- `svix.verify(` present in webhooks.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Seed data used schema column names, not plan aliases**
- **Found during:** Task 2
- **Issue:** The plan's `DEFAULT_MERCHANT_RULES` array used `matchValue` and `renameDescription` field names, but the classification.ts schema defines these columns as `pattern` and `renameTo`. Using the plan's names would cause TypeScript errors and runtime failures.
- **Fix:** Used correct schema column names (`pattern`, `renameTo`) in seed data throughout.
- **Files modified:** packages/db/src/seeds/merchantRules.ts
- **Commit:** d82999a

**2. [Rule 1 - Bug] Mock type assertion caused TypeScript errors**
- **Found during:** Task 2 typecheck
- **Issue:** `{ values: mockFn } as ReturnType<typeof db.insert>` failed TypeScript because Drizzle's `PgInsertBuilder` has many required properties. The plan used this pattern verbatim.
- **Fix:** Introduced `mockInsertReturn` helper using `unknown` intermediate cast: `{ values: mockValues } as unknown as ReturnType<typeof db.insert>`.
- **Files modified:** packages/db/src/__tests__/seeds.test.ts
- **Commit:** d82999a

**3. [Rule 1 - Bug] Cross-test mock call count pollution in seedOrg test**
- **Found during:** Task 2 test run
- **Issue:** `seedOrg` test expected `db.insert` to be called 2 times but it was 3 (previous test calls leaked). The `seedOrg` describe block had no `beforeEach`.
- **Fix:** Added `vi.clearAllMocks()` inline at start of the seedOrg test.
- **Files modified:** packages/db/src/__tests__/seeds.test.ts
- **Commit:** d82999a

## Known Stubs

None — all seed functions are fully wired with real data. The webhook handler is complete with svix verification and seedOrg invocation.

## Self-Check: PASSED
