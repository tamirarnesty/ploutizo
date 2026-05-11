# Codebase Concerns

**Analysis Date:** 2026-05-11

## Tech Debt

**Deferred schema columns — originalDescription / originalMerchant:**
- Issue: `originalDescription` and `originalMerchant` columns are absent from the DB schema but referenced in two TODO comments tagged `03.4-deferred`. The UI components that would render the import caption ("└ Original: …") are stubbed out and currently omit this field entirely.
- Files: `apps/web/src/components/transactions/TransactionForm.tsx:584`, `apps/web/src/components/transactions/TransactionTypeFields.tsx:16`
- Impact: Imported transactions do not display their original bank memo in the edit form. The schema patch must land before the UI can be completed.
- Fix approach: Add `original_description text` and `original_merchant text` columns to the `transactions` table via a Drizzle migration, expose them in `TX_COLUMNS` in `apps/api/src/lib/queries/transactions.ts`, then uncomment the deferred UI sections.

**Recurring templates — column without backing table:**
- Issue: `transactions.recurringTemplateId` is a UUID column with no foreign key because the `recurring_templates` table does not exist in v1. The schema comment calls this "reserved for v2." Enums for `recurring_frequency` and `recurring_status` exist in `packages/db/src/schema/enums.ts` but no table references them.
- Files: `packages/db/src/schema/transactions.ts:83-86`, `packages/db/src/schema/enums.ts:61-70`
- Impact: Low — column is nullable and unused. No runtime risk, but the dangling enums and orphan column create schema confusion.
- Fix approach: Either drop the orphan column until the recurring feature ships, or create the `recurring_templates` table stub with a proper FK constraint.

**`statementDueDay` has no UI write path:**
- Issue: `accounts.statementDueDay` (integer, 1-31) is read by the settlements feature to compute due dates. However `AccountFormSchema` in `packages/validators/src/accounts.ts` does not include `statementDueDay`, the `createAccountSchema` does not include it, and the `AccountForm` component has no field for it. Users cannot set or update the due day from the UI.
- Files: `packages/validators/src/accounts.ts`, `apps/web/src/components/accounts/AccountForm.tsx`, `packages/db/src/schema/accounts.ts:46`
- Impact: Medium — the settlement due date feature is functional at the API level but effectively read-only from the UI. Accounts can only get a `statementDueDay` via direct DB writes.
- Fix approach: Add `statementDueDay: z.number().int().min(1).max(31).nullable().optional()` to `AccountFormSchema` and `updateAccountSchema`, then add a numeric input field to `AccountForm`.

**Member role is hard-coded to `'admin'`:**
- Issue: `orgMembers.role` is a Postgres enum that only supports `'admin'`. The webhook handler in `apps/api/src/services/webhooks.ts:94` ignores the Clerk role and always inserts `'admin'`. The `memberRoleEnum` comment says "All members are admin in v1 — field reserved for future use."
- Files: `apps/api/src/services/webhooks.ts:94`, `packages/db/src/schema/enums.ts:14-16`
- Impact: Low currently, but expanding to role-differentiated permissions in the future will require a data migration for all existing rows.
- Fix approach: When roles expand, add new values to the `member_role` enum via migration, then update the webhook handler to map Clerk roles to the local enum.

**`old-artifacts/` directory in repo root:**
- Issue: The repo root contains `old-artifacts/` with 12 TypeScript schema files (relations.ts, transactions.ts, etc., totalling ~1700 lines) that are not imported anywhere in `apps/` or `packages/`. These appear to be superseded schema designs.
- Files: `/Users/tarnesty/Developer/personal/ploutizo/old-artifacts/` (12 files)
- Impact: Dead weight in the repository. Creates noise when searching the codebase.
- Fix approach: Remove the directory. No import references exist.

## Security Considerations

**`isAllowedParty` regex guard is defined but not called:**
- Risk: `apps/api/src/index.ts` exports `isAllowedParty`, a function that validates the JWT `azp` (authorized party) claim via regex to allow `*.ploutizo.app` subdomains. However, the Clerk middleware is configured with a static `authorizedParties` list that only includes the two known origins. The regex function is never passed into the Clerk middleware (the SDK accepts `string[]`, not a function). The comment acknowledges this: "Dynamic subdomain validation (isAllowedParty) is applied at the app layer in Phase 2+." Phase 2+ has not landed.
- Files: `apps/api/src/index.ts:38-59`
- Current mitigation: Static list `['https://ploutizo.app', 'http://localhost:3000']` is enforced. Subdomain tokens would be rejected.
- Recommendation: Either wire `isAllowedParty` into the request pipeline (e.g., in a custom middleware that reads `getAuth(c).sessionClaims?.azp`) or remove the dead function and document the static-list approach as intentional.

**No rate limiting on any API endpoint:**
- Risk: The Hono API has no rate limiting middleware. All `/api/*` routes (authenticated) and `/webhooks/clerk` (HMAC-verified) are unbounded.
- Files: `apps/api/src/index.ts`
- Current mitigation: Clerk JWT validation provides some protection against unauthenticated abuse. Railway may have infrastructure-level limits.
- Recommendation: Add `hono-rate-limiter` or a lightweight in-memory limiter on mutation endpoints (`POST`, `PATCH`, `DELETE`). At minimum, rate-limit `POST /api/households/invitations` to prevent invitation spam.

**`VITE_API_URL` cast without validation:**
- Risk: `apps/web/src/lib/queryClient.ts:4` casts `import.meta.env.VITE_API_URL` to `string` without checking for undefined. If the env var is absent at build time, all API calls will silently request `undefined/api/...`, failing at runtime with no clear error.
- Files: `apps/web/src/lib/queryClient.ts:4`
- Current mitigation: Build will typically fail to start cleanly if Vite var is missing, but no explicit startup guard exists.
- Recommendation: Add a startup assertion: `if (!import.meta.env.VITE_API_URL) throw new Error('VITE_API_URL is not set')`.

**`CLERK_SECRET_KEY` consumed via `process.env` without startup validation:**
- Risk: `apps/api/src/services/households.ts` constructs Authorization headers using `process.env.CLERK_SECRET_KEY` directly on every Clerk REST call. If the env var is absent, all member management operations will send `Authorization: Bearer undefined` and fail at runtime with opaque Clerk errors.
- Files: `apps/api/src/services/households.ts:46, 91, 107, 144`
- Current mitigation: The Clerk middleware would likely fail to initialise if `CLERK_SECRET_KEY` is absent, surfacing the error early.
- Recommendation: Add an env validation step at API startup (e.g., using `zod` to parse `process.env`).

## Performance Bottlenecks

**`enrichTransactions` issues one sub-query per list page:**
- Problem: `enrichTransactions` in `apps/api/src/lib/queries/transactions.ts:344` fetches assignees and tags for the current page of transactions via two parallel `inArray` queries. This is correct for single-page fetches. However, the `Transactions` component in the web app pages through results, and each page transition triggers a fresh `enrichTransactions` call. The approach is sound for paginated data but becomes costly for large `inArray` sets (limit is 200 rows per page).
- Files: `apps/api/src/lib/queries/transactions.ts:344-390`
- Cause: Intentional design (avoids cartesian product from multi-level LEFT JOINs), but the `inArray` size scales with `limit`.
- Improvement path: Already well-optimised for the current pagination model. Consider adding an index on `transaction_assignees.transaction_id` if query plans show sequential scans.

**`computeNextDueDate` called in a loop per account in `getSettlementBalances`:**
- Problem: `apps/api/src/services/settlements.ts:69` calls `computeNextDueDate` once per account inside a `for` loop. Each call creates two `Date` objects. This is a pure CPU operation, not a DB round-trip, so impact is negligible at current household sizes (< 20 accounts typical).
- Files: `apps/api/src/services/settlements.ts:67-73`
- Cause: No concern at current scale.
- Improvement path: No action needed unless account counts grow to hundreds.

**`seenOrgs` in-memory cache resets on every cold start:**
- Problem: `apps/api/src/middleware/tenantGuard.ts:17` uses a module-level `Set<string>` to cache org IDs that have been upserted. On Railway, each deployment or container restart clears the cache, causing an upsert DB round-trip for every org's first request after restart. On a busy deployment this could cause a burst of upsert queries.
- Files: `apps/api/src/middleware/tenantGuard.ts:15-37`
- Cause: Intentional design — DB row persists, cache is a performance optimization. Comment documents this.
- Improvement path: Acceptable as-is. If Railway restarts become frequent, consider a Redis-backed cache or rely solely on `onConflictDoNothing` (it is idempotent and only costs one DB round-trip).

## Fragile Areas

**`useDeleteTransaction` optimistic update uses `unknown[]` Snapshot type:**
- Files: `apps/web/src/lib/data-access/transactions/useDeleteTransaction.ts:5`
- Why fragile: The `Snapshot` type is `[unknown[], TransactionListResponse | undefined][]`. The first element of each tuple (the query key) is typed as `unknown[]` rather than the concrete TanStack Query key type. If `qc.setQueryData` in `onError` receives a stale key format, the rollback silently fails — the cache is not restored and the user sees a missing row until invalidation fires.
- Safe modification: Narrow the Snapshot type to `[QueryKey, TransactionListResponse | undefined][]` where `QueryKey` is imported from `@tanstack/react-query`.
- Test coverage: No test covers the `onError` rollback path of `useDeleteTransaction`.

**`updateTransaction` PATCH returns scalar row without tags/assignees; cache merge is brittle:**
- Files: `apps/web/src/lib/data-access/transactions/useUpdateTransaction.ts:21-30`
- Why fragile: `onSuccess` merges the PATCH response with the existing cache entry, falling back to `[]` for `tags` and `assignees` if no prior cache entry exists. If the detail query was never issued (e.g., user edits immediately after list load), `prev` is `undefined` and the merged entry will have empty arrays — visually correct once `onSettled` invalidation fires, but there is a brief window where the detail panel shows no assignees.
- Safe modification: Fire a `refetchQueries` for the detail key in `onSuccess` rather than relying on the merge.
- Test coverage: No test covers the `onSuccess` merge path of `useUpdateTransaction`.

**Webhook `organizationMembership.deleted` event is silently ignored:**
- Files: `apps/api/src/services/webhooks.ts:100-106`
- Why fragile: When a member is removed via the Clerk dashboard (rather than via `DELETE /api/households/members/:id`), no webhook handler fires to remove the `org_members` row. The local DB and Clerk fall out of sync: the member continues to appear in `GET /api/households/members` even though their Clerk membership is gone.
- Safe modification: Add a `handleOrgMembershipDeleted` handler that deletes the `org_members` row by matching the Clerk user ID to `users.external_id`.
- Test coverage: No test exists for the membership.deleted event.

**`TransactionForm` is 789 lines — high cognitive complexity:**
- Files: `apps/web/src/components/transactions/TransactionForm.tsx`
- Why fragile: The form handles 6 transaction types with shared and type-specific fields. The outer/inner split reduces query coupling, but the inner form still contains multiple renderless helper components (`DescriptionSyncer`, `RefundDataLoader`, `DirtyNotifier`, `TypeResetWatcher`). Changes to the form lifecycle require understanding all four side-effect components.
- Safe modification: Isolate each helper into a well-named file; ensure all `useEffect` dependencies are fully specified. Adding a new type requires auditing all four helpers.
- Test coverage: No component-level tests exist for `TransactionForm`.

## Scaling Limits

**Neon WebSocket Pool — not recommended for persistent servers:**
- Current capacity: Neon recommends WebSocket pool for serverless/scale-to-zero deployments. The API runs on Railway (persistent server), but WebSocket mode was chosen intentionally for Neon's scale-to-zero benefit.
- Limit: Under sustained connection pressure, the WebSocket pool may have lower throughput than a TCP pool (postgres.js). For hobby-scale workloads this is not a concern.
- Scaling path: If connection bottlenecks appear, switch `packages/db/src/client.ts` to postgres.js with connection pooling (PgBouncer on Neon).

**Transaction list pagination cap at 200 rows:**
- Current capacity: `GET /api/transactions` enforces `limit = Math.min(200, ...)` in `apps/api/src/routes/transactions.ts:60`. The web client requests 50 rows by default.
- Limit: Orgs with very large transaction histories (10k+ rows) will experience slow `COUNT(*)` queries as the filter set grows. The count query runs on every list fetch alongside the page query.
- Scaling path: Replace `COUNT(*)` with cursor-based pagination, or cache the count separately.

## Dependencies at Risk

**`@neondatabase/serverless` WebSocket on a persistent server:**
- Risk: Neon's own documentation recommends TCP (`postgres.js`) for persistent server deployments. The WebSocket pool is intended for edge/serverless runtimes. This mismatch is documented in `packages/db/src/client.ts` and accepted intentionally for scale-to-zero.
- Impact: Potential connection churn under load. No current production evidence of a problem.
- Migration plan: Replace `Pool` from `@neondatabase/serverless` with `postgres` (postgres.js) and use `drizzle-orm/postgres-js`. Update `neonConfig` usage accordingly.

**Clerk SDK version pinning:**
- Risk: `@clerk/hono` was recently migrated from `@hono/clerk-auth` (Phase 03.6). The `authorizedParties` field accepts only `string[]`, not a validator function — a limitation noted in `apps/api/src/index.ts:38` with "RESEARCH.md LOW confidence" that Clerk wildcard globs work. Future Clerk SDK upgrades may change this behavior.
- Impact: If Clerk changes `authorizedParties` semantics, the static list approach may silently stop enforcing the AZP check.
- Migration plan: Pin the Clerk SDK version in `apps/api/package.json` and add a changelog review to the upgrade checklist.

## Test Coverage Gaps

**No frontend component tests:**
- What's not tested: All React components in `apps/web/src/components/` have zero test coverage. This includes `TransactionForm`, `Transactions`, `AccountForm`, `CategoriesSettings`, `RuleForm`, and all data-access hooks except `lrm.ts`.
- Files: `apps/web/src/components/` (entire directory), `apps/web/src/lib/data-access/` (all mutation hooks)
- Risk: Regressions in form logic (assignee splits, type switching, description locking) go undetected until manual QA.
- Priority: High — `TransactionForm` is the most complex UI component and the most likely source of regressions.

**`useDeleteTransaction` rollback path is untested:**
- What's not tested: The `onError` optimistic rollback in `apps/web/src/lib/data-access/transactions/useDeleteTransaction.ts:44-49` has no test. The rollback iterates `context.snapshots` and calls `qc.setQueryData` — if `context` is undefined (e.g., `onMutate` threw), `for...of` on `undefined` would throw a secondary error.
- Files: `apps/web/src/lib/data-access/transactions/useDeleteTransaction.ts`
- Risk: Silent cache corruption on delete failure.
- Priority: Medium.

**`useUpdateTransaction` onSuccess merge is untested:**
- What's not tested: The cache merge logic in `apps/web/src/lib/data-access/transactions/useUpdateTransaction.ts:21-30` is not covered. The `prev === undefined` fallback branch is never exercised.
- Files: `apps/web/src/lib/data-access/transactions/useUpdateTransaction.ts`
- Risk: Brief window of empty assignees/tags on update before invalidation fires.
- Priority: Low.

**Webhook `dispatchWebhookEvent` unknown-type branch untested:**
- What's not tested: The final `// Unknown event types are silently ignored` branch in `apps/api/src/services/webhooks.ts`. More critically, `organizationMembership.deleted` is an unhandled known event type that falls through to the silent-ignore path.
- Files: `apps/api/src/services/webhooks.ts:100-106`
- Risk: Member removal via Clerk dashboard leaves stale `org_members` rows.
- Priority: High (see Fragile Areas).

---

*Concerns audit: 2026-05-11*
