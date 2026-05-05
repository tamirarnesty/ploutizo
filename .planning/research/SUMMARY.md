# Research Summary — ploutizo

**Project:** ploutizo — personal finance tracker for Canadian households
**Domain:** Multi-tenant personal finance / household expense management
**Researched:** 2026-03-24
**Confidence:** MEDIUM-HIGH overall

---

## Executive Summary

ploutizo is a multi-tenant household finance tracker — a category with well-established patterns in personal finance apps (YNAB, Firefly III, Actual Budget) and mature open-source precedent. The research confirms that the planned stack is sound with one critical correction: the Hono API runs as a persistent Node.js server on Railway, so the Neon database driver must be `postgres.js` with a direct connection URL — not the `neon-http` driver used in most Neon quickstart examples, which silently breaks DB transactions. This is the single most important stack correction from research.

The architecture decisions are largely validated. Application-level tenant isolation (WHERE clause + `tenantGuard()` middleware) is the correct choice over Postgres RLS for this architecture. Single-table transaction design, integer cents storage, soft-delete with `deleted_at`, and query-time settlement balance computation are all confirmed as appropriate patterns for the scale and use case. The Canadian-specific finance features (TFSA room calculation, FHSA carry-forward mechanics, budget rollover behavior) have well-documented rules — but the 2026 annual limits for TFSA and RRSP require verification against CRA before hardcoding.

The two highest-risk areas requiring early attention are: (1) Clerk satellite domain configuration for the `{subdomain}.ploutizo.app` multi-tenant routing, which is a Phase 1 infrastructure prerequisite not originally called out in REQUIREMENTS.md; and (2) Canadian bank CSV format validation — the normalizer research is LOW confidence and must be tested against real bank exports before the import feature ships. React Query stale-balance behavior after mutations is a guaranteed UX bug if not addressed explicitly during transaction and settlement implementation.

---

## Critical Findings (must address before writing code)

1. **Use `postgres.js` with direct Neon URL — not `neon-http`.** The `neon-http` driver does not support DB transactions (no `BEGIN`/`COMMIT`). Every multi-step write in ploutizo — import batch + transactions, transaction + assignees, settlement recording — requires atomicity. `apps/api` is a persistent Node.js server; use `drizzle-orm/postgres-js` with `postgres(process.env.DATABASE_URL!)`. Do not use `@neondatabase/serverless` neon-http mode. The direct connection URL (not the `-pooler.` URL) is correct for this setup; `postgres.js` manages its own connection pool.

2. **Clerk `orgId` is `undefined`, not `null`, when no active org is set.** The `tenantGuard()` middleware must check `!orgId` (falsy), not `orgId === null`. Users who sign in before joining a household, or whose org cookie expires, will have `orgId === undefined`. A strict null check passes silently and allows unauthenticated DB queries through.

3. **Clerk satellite domains are required for subdomain multi-tenancy.** The `{subdomain}.ploutizo.app` routing requires explicit Clerk satellite domain configuration. The primary domain (`ploutizo.app`) handles sign-in; satellite subdomains read session state from the primary via `satelliteAutoSync: true`. DNS CNAME records for `clerk.{subdomain}.ploutizo.app` must be configured in production. `authorizedParties` must be set in `clerkMiddleware()` to include `*.ploutizo.app`. This is a Phase 1 infrastructure task — nothing else works correctly without it.

4. **Never set `DATABASE_URL` or `CLERK_SECRET_KEY` as `VITE_*` env vars.** Vite embeds `VITE_*` variables into the browser JavaScript bundle at build time. Railway project-level environment variables are shared across services — if secrets are set at the project level rather than per-service, they will be exposed publicly via the web bundle. Always set `DATABASE_URL` at the `apps/api` service level only.

5. **Amex Canada CSV sign convention is inverted.** Positive values in Amex exports are charges (expenses), not income. Every other supported Canadian bank uses negative = outgoing. The normalizer must explicitly multiply Amex amounts by -1. This is the single most dangerous CSV parsing bug — silent wrong sign on all credit card expenses.

6. **`orgId` must never be sourced from request body or path params.** Always and only from `getAuth(c).orgId` via the verified Clerk JWT. This is already documented in CLAUDE.md but bears repeating as a pre-code invariant.

7. **React Query must invalidate balance queries on every financial mutation.** Do not use optimistic updates for balance displays. Use `onSettled` to call `queryClient.invalidateQueries` for `['balances', orgId]`, `['transactions', orgId]`, and `['budgets', orgId]` after every mutation that affects monetary values. Stale balances after settlement are a guaranteed UX failure if this is not implemented from the start.

---

## Architecture Decisions Confirmed

- **Single flexible `transactions` table** with nullable type-specific columns is correct. Enforce type constraints in Zod discriminated unions in `@ploutizo/validators`, not as Postgres CHECK constraints. This is consistent with YNAB, Firefly III, and Actual Budget.
- **Application-level tenant isolation** (WHERE clause + `tenantGuard()` + non-nullable `org_id`) is the right choice over Postgres RLS. The API is the sole DB client; `DATABASE_URL` is private to `apps/api`; RLS would add session-variable plumbing complexity with no security benefit.
- **Integer cents for all money storage.** `integer` columns for individual amounts; SUM aggregations must be cast to `bigint` in SQL to avoid overflow on net worth calculations for asset-rich households.
- **`deleted_at TIMESTAMP WITH TIME ZONE`** for soft delete (not `is_deleted` boolean) — provides audit trail, supports 30-day recovery window, and enables future auto-purge jobs via timestamp comparison.
- **Compute settlement balances at query time** with proper indexes in v1. A composite index on `(org_id, account_id) WHERE deleted_at IS NULL` makes this fast for 100k+ transactions. Materialized views add complexity with no measurable benefit at household scale.
- **JIT (just-in-time) packages** for `@ploutizo/validators` and `@ploutizo/types` — export from `src/index.ts`, no build step required. Faster DX; Vite and esbuild both transpile TypeScript source directly.
- **Split remainder to first assignee** (by insertion order) using the largest-remainder method. `transaction_assignees.percentage` is display cache only; `amount` is authoritative for all balance calculations.
- **`external_id` + Levenshtein fuzzy match** as two-signal deduplication strategy. Pre-normalize descriptions (strip phone numbers, branch codes) before comparison; threshold at normalized distance < 0.2. Pre-filter by exact date + amount before running Levenshtein.
- **Partial indexes on `deleted_at IS NULL`** for all active-data indexes — smaller index footprint, equal speed for the 99%+ of queries that filter on non-deleted rows.
- **`generate` + `migrate` workflow** for all non-local environments. `push` is dev-only. Run `db:migrate` as a Railway pre-deploy command for `apps/api`.
- **RRSP v1 as manual room override** — store `manual_rrsp_room_cents` in `contribution_room_settings`; user enters room from their CRA NOA. Full formula (18% × earned income − PA) deferred to v2.

---

## Architecture Decisions Updated

- **Database driver changed from `@neondatabase/serverless` to `postgres.js`.** Original scaffolding and most Neon docs point to the neon-serverless driver. For a persistent Railway Node.js server, `postgres.js` with direct connection URL is correct and fully supports transactions. The neon-http warning from PITFALLS.md applies to that specific driver, not to `postgres.js`.

- **Neon pooler URL (`-pooler.`) should NOT be used with `postgres.js`.** The pooler adds an unnecessary extra hop for a persistent server. Use the direct connection URL. `postgres.js` built-in pool (max 10) is sufficient for Railway Hobby plan. If the pooler URL is ever needed (e.g. many concurrent instances), add `{ prepare: false }` to disable prepared statements, as PgBouncer transaction mode does not support them.

- **Clock skew tolerance must be raised.** Bump `clockSkewInMs` from the default 5000ms to 10000ms in `authenticateRequest()`. Railway container clocks can drift; a drift over 5s causes complete silent auth failure that appears as "user not logged in" rather than a clock error.

- **Budget rollover needs a cap not in REQUIREMENTS.md.** The spec says surplus-only rollover with no accumulation cap. Research recommends capping rollover at `base_limit` to prevent runaway effective limits after extended periods of underspending (e.g. $500 base → effective limit never exceeds $1,000). This must be raised with the product owner as an open question before budget implementation (see Open Questions).

- **TFSA room calculation does NOT include 2026 limit.** The research table runs through 2025 ($7,000, cumulative $102,000). The 2026 limit is not yet in the research data. The constant file must be updated once CRA confirms the 2026 amount (see Needs Verification).

- **Clerk JWT claim names changed in v2 (deprecated April 2025).** Raw JWT claims use compact names (`o.id` not `org_id`). Always use `getAuth(c).orgId` — never read `sessionClaims.org_id` directly. The `@clerk/hono` middleware normalizes this.

- **CORS must precede Clerk middleware.** If Clerk runs before CORS, OPTIONS preflight requests are rejected with 401 (no `orgId` triggers tenant guard). Correct order: CORS → `clerkMiddleware()` → `tenantGuard()`.

---

## Open Questions (needs decision before implementation)

1. **Budget rollover accumulation cap.** Should rollover be capped at `base_limit` (so effective limit never exceeds 2× base)? Or can it grow further? REQUIREMENTS.md specifies surplus-only rollover but sets no cap. Research recommends capping at `base_limit`. Needs a product decision before the budgets feature is implemented — this affects the `calcBudgetRollover` function and the UI display of effective limits.

2. **Cloudflare proxy for Clerk subdomain.** The Clerk frontend API subdomain (`clerk.ploutizo.app`) must be set to "DNS only" (grey cloud) in Cloudflare, not proxied (orange cloud). Is this documented in the infra setup plan? Proxied Clerk subdomains break session management in production. Needs explicit callout in deployment runbook.

3. **TFSA withdrawal restoration in v1.** The app tracks contributions only. Withdrawals restore TFSA room in the following calendar year — but v1 does not model this. The TFSA room calculation will therefore diverge from CRA reality for any user who has made TFSA withdrawals. Should the UI show a clear disclaimer, or should a manual adjustment field be added to `contribution_room_settings`? This is a UX decision before savings/investments implementation.

4. **FHSA "used for home purchase" account status.** Research confirmed that once FHSA funds are used to buy a home, the account must be closed within 1 year and no further contributions are allowed. The app should support marking an FHSA account as "used for home purchase" to freeze room tracking and prevent new contributions. Is this in scope for v1 or deferred to v2?

5. **Settlement card UI for negative member balances.** If a member overpays a settlement (pays more than they owe), their balance goes negative. The UI must render this as a credit ("Emily is owed $40") not as a negative debt. What is the correct label and visual treatment? Needs design decision before settlement UI implementation.

6. **`drizzle-kit generate` in CI against which Neon branch?** Migrations must not run against production Neon. CI needs a dedicated dev branch URL. How is this provisioned (manual, Neon GitHub Action, per-PR branches)?

---

## Phase Implications

### Phase 1 — Foundation & Auth Infrastructure

**Research changes this phase significantly.** Clerk satellite domain configuration is not in REQUIREMENTS.md but is a hard dependency for the entire subdomain-per-household model. This must happen in Phase 1, not as an afterthought.

- Configure `@clerk/hono` with correct middleware order (CORS → Clerk → `tenantGuard()`), `authorizedParties`, and `clockSkewInMs: 10000`
- Configure Clerk satellite domains with `satelliteAutoSync: true` on `apps/web`
- Set `allowedRedirectOrigins` on `ClerkProvider` for `*.ploutizo.app`
- Add DNS CNAME records for `clerk.{subdomain}.ploutizo.app` (production only; document this in deployment runbook)
- Set `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` as per-service env vars on Railway — never at project level alongside `VITE_*` vars
- Initialize `postgres.js` client at module scope in `apps/api` using direct Neon URL
- Establish package boundary rules (JIT packages for `validators` and `types`)
- Seed scripts: `seedOrgCategories(orgId)` + `seedOrgMerchantRules(orgId)` called at org creation

**Research flags:** Standard patterns once satellite domain gotcha is understood. No phase-level research needed.

### Phase 2 — Accounts, Categories, Transactions Core

- Implement single flexible `transactions` table with `deleted_at` soft delete
- Add all required indexes at schema definition time (partial indexes on `deleted_at IS NULL`)
- Implement `tenantGuard()` with falsy check (`!orgId`), not strict null
- Add `isLoaded` guards on all Clerk hooks before rendering org-specific content
- Implement split math using largest-remainder method; `percentage` as display cache only
- Set up React Query `QueryClient` with default `queryFn` that injects Clerk bearer token via `getToken()`
- Use `onSettled` (not `onSuccess`) for query invalidation after all financial mutations

**Research flags:** No deeper research needed — all patterns are well-documented.

### Phase 3 — CSV Import

**Research strongly flags this phase as needing real-world validation.**

- Write each bank normalizer as a pure function with fixture CSVs committed to the repo — test with real exports, not just training-data assumptions
- Apply BOM stripping (`\uFEFF`) before parsing ALL CSV inputs, not just specific banks
- Implement Amex sign inversion explicitly with a comment explaining the inverted convention
- Implement `iconv-lite` fallback for Scotiabank (potential Windows-1252 encoding)
- Store detected bank format on `import_batches` record for debugging
- Implement two-signal deduplication: `external_id` exact match first; Levenshtein fallback with pre-normalization
- Add bank-format detection with null fallback that surfaces a user-visible error for unrecognized formats

**Research flags: HIGH — bank CSV formats are LOW confidence.** Obtain real exports from at least TD, RBC, CIBC, and Amex before writing normalizers. Column names and file structures change; the detection signatures in FEATURES.md are training-data derived. Fixture-based unit tests are essential and must use real exported files.

### Phase 4 — Settlement

- Compute balances at query time using the index strategy from ARCHITECTURE.md
- Index `(org_id, account_id) WHERE deleted_at IS NULL` on transactions
- Index `(transaction_id, member_id)` on `transaction_assignees`
- Handle negative member balance (overpayment) gracefully in UI — see Open Question 5
- Hide settlement cards for accounts where all members have $0 balance
- React Query: invalidate `['balances', orgId]` and `['transactions', orgId]` on settlement mutation via `onSettled`

**Research flags:** Standard patterns. No deeper research needed.

### Phase 5 — Budgets

- Implement rollover cap (see Open Question 1 — resolve product decision before coding)
- For partial-period budget creation (mid-month): use full `base_limit`, not prorated
- Store `effective_limit_cents` per period to avoid recomputing full history chain on every view
- Budget period queries must use UTC midnight for date boundaries

**Research flags:** Standard patterns. Rollover cap decision must be made before this phase.

### Phase 6 — Savings & Investments (TFSA, RRSP, FHSA)

- Verify 2026 TFSA limit with CRA before shipping (see Needs Verification)
- Verify 2025/2026 RRSP dollar cap before hardcoding (see Needs Verification)
- TFSA: store `TFSA_ANNUAL_LIMITS` as `Record<number, number>` constant in `packages/types`; update each January
- TFSA room disclaimer in UI: "Your CRA room may differ due to withdrawals made in prior years or years of non-residency"
- FHSA: compute prior year unused room from contribution history grouped by year — not just total contributions
- FHSA: enforce `min(computed_room, 40000_00 - total_contributions_cents)` lifetime cap
- RRSP: manual room input labeled "Available RRSP room (from your NOA or CRA My Account)"; show last-updated date; warn at contributions > `manual_room + $2,000`
- Resolve TFSA withdrawal UI (Open Question 3) before implementation
- Resolve FHSA home purchase status (Open Question 4) before implementation

**Research flags:** CRA rules are HIGH confidence for formulas; 2026 annual limits NEED_VERIFICATION against CRA. No additional phase research needed beyond limit verification.

---

## Needs Verification

- **TFSA 2026 annual limit** — Research table runs through 2025 ($7,000). The 2026 limit is indexed to CPI and announced by CRA. Current date is 2026-03-24; CRA may have already announced the 2026 limit. Verify at https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributions.html before hardcoding `TFSA_ANNUAL_LIMITS[2026]`.

- **RRSP 2025/2026 dollar caps** — Research reports $32,490 for 2025 as "widely reported" but notes MEDIUM confidence. Verify the exact 2025 cap and the 2026 cap (if announced) at https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/contributing-a-rrsp-prpp/contributions-affect-your-rrsp-prpp-deduction-limit.html.

- **Canadian bank CSV column names and formats** — Research confidence is LOW for exact column headers. TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine, and EQ Bank format tables are based on training data (pre-August 2025 cutoff). Banks change their export formats without notice. Validate each bank's detection signature and normalizer function against real exports before shipping the import feature. Treat the `BANK_SIGNATURES` table in FEATURES.md as a starting point, not a specification.

- **Neon connection limits by plan tier** — The specific connection limit numbers for Neon Free vs Launch vs Scale tiers were not directly confirmed during research (access restricted). Validate the connection limit on the chosen Neon plan against `postgres.js` pool `max` default (10) before production. Add a `/health/ready` endpoint that pings the DB to surface connection exhaustion early.

- **ReUI component Tailwind v4 compatibility** — ReUI (`@reui/*`) is shadcn-based. Its Tailwind v4 compatibility status should be verified before `DataGrid` (transaction list) and `Filters` (transaction filter bar) are integrated. A styling regression in these components is high-impact as they are core UI. Check https://reui.io/docs for current compatibility notes.

- **Scotiabank Windows-1252 encoding** — Research flagged that older Scotiabank accounts may export Windows-1252 encoded CSVs. This needs real-world testing. If confirmed, add `iconv-lite` dependency to the import pipeline.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core choices (postgres.js, Clerk, Drizzle, Railway) verified against official docs. Driver correction (postgres.js over neon-http) is well-sourced. |
| Features | MEDIUM | CRA rules (TFSA, FHSA, RRSP) are HIGH confidence from official sources. Bank CSV formats are LOW confidence — need real exports. Settlement and budget logic is MEDIUM from industry pattern analysis. |
| Architecture | HIGH | Multi-tenancy strategy, money storage, soft delete, split math, and query-time balances all verified against official Drizzle/Postgres docs. |
| Pitfalls | MEDIUM-HIGH | Clerk auth gotchas, Tailwind v4 breaks, and React Query stale state are HIGH confidence. Railway-specific behaviors (pnpm cache, health check timing) are MEDIUM — partial official coverage. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Bank CSV real exports:** Low-confidence area that cannot be resolved by further research. Must be validated during Phase 3 implementation with actual bank downloads.
- **CRA 2026 annual limits:** Quick external validation (CRA website) before savings/investments phase begins. Not blocking earlier phases.
- **Budget rollover cap:** Product decision, not a research gap. Needs owner decision before Phase 5.
- **TFSA withdrawal UX:** Product decision on whether to add a manual adjustment field or show a disclaimer only. Needs owner decision before Phase 6.
- **FHSA home purchase status:** Product decision on v1 vs v2 scope. Needs owner decision before Phase 6.

---

## Sources

### Primary (HIGH confidence)
- Clerk Auth Object reference — `orgId` extraction, JWT v2 claim names, satellite domains
- Drizzle ORM docs (`orm.drizzle.team`) — postgres.js connection, migrations, RLS, column types
- PostgreSQL 16 numeric types docs — integer overflow analysis
- Tailwind CSS v4 upgrade guide — breaking changes, class renames
- React Query docs — optimistic updates, query invalidation, `onSettled` pattern
- CRA TFSA publications — annual limits 2009–2025, eligibility rules
- CRA FHSA publications — carry-forward mechanics, lifetime cap, account open requirement
- `@clerk/hono` (npm) — middleware order, `getAuth()` usage

### Secondary (MEDIUM confidence)
- TanStack Start Railway deployment patterns — no Start-specific Railway docs; inferred from Vinxi/Node.js output behavior
- React Query + TanStack Start SSR integration — conceptually verified; Start-specific nuances may exist
- Turborepo JIT package patterns — docs access partially restricted during research
- Railway health check and env var isolation — general Railway knowledge, not current docs
- Neon connection limit specifics — plan page not directly accessible during research

### Tertiary (LOW confidence)
- Canadian bank CSV column names and formats — training data (pre-August 2025 cutoff). All 8 bank format tables require real-export validation before use.
- Scotiabank Windows-1252 encoding — community reports; needs empirical testing
- ReUI Tailwind v4 compatibility — not directly verified at time of research

---

*Research completed: 2026-03-24*
*Ready for roadmap: yes*
