# ploutizo — Roadmap

> **Milestone:** v0.1 MVP
> **Granularity:** Standard
> **Coverage:** 11/11 requirement sections mapped
> **Last updated:** 2026-03-24

---

## Milestone 1: v0.1 MVP

### Phase 1: Foundation & Auth Infrastructure

**Goal:** The monorepo builds and deploys cleanly. Authentication works across
subdomains. The API enforces tenant isolation on every request. All
infrastructure prerequisites are in place before any feature code is written.

**Delivers:**
- Turborepo monorepo with all packages (`web`, `api`, `ui`, `db`, `validators`, `types`) building successfully
- Clerk org configuration: `<OrganizationSwitcher />` for in-app household switching, `authorizedParties: ['https://ploutizo.app']`, `clockSkewInMs: 10000`
- `postgres.js` direct-connection Drizzle client in `apps/api` (not `neon-http`)
- `tenantGuard()` middleware with falsy `orgId` check, correct middleware order (CORS → Clerk → tenant guard)
- `Railway pre-deploy` migration command (`db:migrate`) wired and verified
- Seed scripts: `seedOrgCategories(orgId)` and `seedOrgMerchantRules(orgId)` called at org creation
- Tailwind v4 component audit documented — explicit border colors, ring colors, shadow/blur scales confirmed
- Env var isolation: `DATABASE_URL` and `CLERK_SECRET_KEY` at service level, not project level
- `clockSkewInMs: 10000` set on Clerk middleware to handle Railway container clock drift

**Plans:** 4/6 plans executed

Plans:
- [x] 01-01-PLAN.md — Package namespace rename: @workspace/ui -> @ploutizo/ui, create @ploutizo/validators + @ploutizo/types skeletons, vitest workspace, turbo.json tasks
- [x] 01-02-PLAN.md — @ploutizo/db package: postgres.js Drizzle client at module scope, drizzle.config.ts, schema stubs, DB client unit tests
- [x] 01-03-PLAN.md — apps/api scaffold: Hono app with CORS -> Clerk -> tenantGuard middleware order, health endpoint, vitest configured
- [x] 01-04-PLAN.md — Clerk + tenantGuard: complete tenantGuard with 5 unit tests, Clerk in apps/web, React Query with token injection
- [x] 01-05-PLAN.md — Seed scripts: seedOrgCategories + seedOrgMerchantRules + seedOrg wrapper, Clerk org.created webhook handler
- [x] 01-06-PLAN.md — Railway deploy + smoke test: railway.toml with pre-deploy migration, Tailwind v4 audit, live deployment verified

**Requirements covered:**
- §1 Households & Users (infrastructure portion: subdomain auth, org creation hooks, seed scripts)
- §9 Merchant Rules (seed script only — CRUD deferred to Phase 2)
- Infrastructure requirements from `.planning/REQUIREMENTS.md`: Clerk satellite domains, `postgres.js` driver, Tailwind v4 audit, `tenantGuard()` falsy check

**Success criteria:**
- [x] `pnpm build` succeeds across all packages with zero type errors
- [x] Switching household via `<OrganizationSwitcher />` updates the active `orgId` in the Clerk session; the next API request is scoped to the new org
- [x] Any API request without an active org (`orgId` is `undefined`) returns 401 — confirmed by sending a request with a valid Clerk user JWT but no active org
- [x] `apps/api` can execute a multi-step DB transaction (INSERT + INSERT in a single `tx`) without error — confirming `postgres.js` driver
- [x] Org creation inserts default categories and merchant rules with non-nullable `org_id` rows; no nullable `org_id` rows exist in the DB
- [x] `VITE_DATABASE_URL` and `VITE_CLERK_SECRET_KEY` do not appear in the browser JavaScript bundle

---

### Phase 2: Households, Accounts & Classification

**Goal:** Users can create and manage households, invite members, set up their
financial accounts, and manage the category/tag/merchant-rule structures that
classify transactions. All prerequisite data structures are in place before the
first transaction is created.

**Delivers:**
- Household creation flow: user sets display name, Clerk org created via `organizations.createOrganization()`, local `orgs` row inserted via webhook
- Member invitation flow via Clerk's `<OrganizationProfile />` component — Clerk handles email delivery, token lifecycle, accept/decline
- Household switcher in sidebar
- Account CRUD: all 7 types, personal/shared ownership, "each person pays their own" flag, active/archived status
- Category CRUD: default seed list visible after org creation, add/rename/reorder/archive, no deletion if referenced
- Tag CRUD: select-or-create-inline flow, archive-only deletion if referenced
- Merchant rule CRUD: add/edit/delete/reorder rules, all 5 match types, regex validation at save time
- `formatCurrency(cents)` utility available in `apps/web`

**Plans:** 5/6 plans executed

Plans:
- [x] 02-01-PLAN.md — Accounts DB schema + validators + types + API routes for /api/accounts and /api/households
- [x] 02-02-PLAN.md — Root org guard + /onboarding + sidebar shell + /dashboard stub + /settings/household
- [x] 02-03-PLAN.md — Accounts page UI: DataTable, slide-over sheet (create/edit/archive), React Query hooks
- [x] 02-04-PLAN.md — Categories/tags/merchant-rules API routes + Settings pages with ReUI Sortable, regex validation
- [x] 02-05-PLAN.md — Gap closure: insert orgs row in webhook before seedOrg(), ReUI Combobox for tag inline-create, add missing seed icons (HeartPulse, Sparkles, MoreHorizontal)
- [x] 02-06-PLAN.md — UI code quality: replace all raw HTML with shadcn/ReUI primitives, fix .js import extensions

**Requirements covered:**
- §1 Households & Users (full feature)
- §2 Accounts (full feature)
- §3 Categories & Tags (full feature)
- §9 Merchant Rules (CRUD — rule application deferred to Phase 5 where it's exercised)

**Success criteria:**
- [ ] Invited member can accept via Clerk's invitation email and immediately see household data at `ploutizo.app`; declined invitations leave the household unchanged
- [ ] Account created with "each person pays their own" flag is visible in account list but excluded from settlement balance queries (verified in Phase 4)
- [ ] Default category list (11 categories with Lucide icons) is present immediately after org creation; a category referenced by at least one transaction cannot be hard-deleted, only archived
- [ ] Tag created inline during a form flow is available for reuse in subsequent transaction forms
- [ ] Merchant rule with `regex` match type is rejected at save if the pattern is invalid; valid rule is saved and priority-ordered correctly

---

### Phase 02.4: app shell and sidebar redesign (INSERTED)

**Goal:** Rebuild the app shell and sidebar into their final form: collapsible icon rail, slim full-width top bar with UserButton, sidebar header with Ploutizo wordmark and OrganizationSwitcher, Settings moved to a footer link, and a dedicated /settings page with vertical sub-nav.
**Requirements**: D-01 through D-14 (see 02.4-CONTEXT.md)
**Depends on:** Phase 02
**Plans:** 2/2 plans complete

Plans:
- [x] 02.4-01-PLAN.md — Shell restructure + sidebar rebuild: TopBar component, collapsible icon rail, wordmark header, footer Settings link + collapse toggle
- [x] 02.4-02-PLAN.md — Settings vertical sub-nav layout: two-column SettingsLayout with left nav (Categories & Tags, Merchant Rules, Household) + Outlet

### Phase 02.3: vercel skills audit and guidelines (INSERTED) ✅ COMPLETE

**Goal:** Prune Next.js/RSC rules from the vercel-react-best-practices skill, fix all SPA violations in apps/web (waterfall fetches, setState-during-render), audit and fix composition patterns and web design guideline violations, and write CLAUDE.md with explicit Vercel skill trigger conditions so future agents apply these skills automatically.
**Requirements**: TBD (no formal requirements — all tasks derive from CONTEXT.md decisions D-01 through D-06)
**Depends on:** Phase 02
**Plans:** 6/6 plans complete

Plans:
- [x] 02.3-01-PLAN.md — Prune RSC-only rules from vercel-react-best-practices SKILL.md (delete 7 rule files, update bundle-dynamic-imports to React.lazy())
- [x] 02.3-02-PLAN.md — Fix confirmed violations: AccountForm waterfall (async-parallel), CategoriesSettings setState-during-render (rerender-derived-state-no-effect), QueryClient staleTime documentation
- [x] 02.3-03-PLAN.md — Composition patterns audit + web-design-guidelines audit: fix all remaining violations across apps/web
- [x] 02.3-04-PLAN.md — Create CLAUDE.md with explicit Vercel skills trigger conditions (D-05, D-06) + human verification checkpoint
- [x] 02.3-05-PLAN.md — Gap closure: autoComplete on 4 text inputs, motion-safe:animate-pulse on 2 skeleton loaders, && -> ternary across 5 files

UAT fixes (post-verification):
- SelectGroup wrappers in RuleForm
- Unified account footer (Archive merged into form footer)
- AccountsTable horizontal scroll on small screens
- Dialog spacing (CategoryForm, RuleForm)
- Tags UI: replaced reui combobox with Base UI (@base-ui/react) multiple combobox — chips live inside the input box with native focus handling
- Sidebar item spacing (gap-1)

### Phase 02.2: add light/dark/system theme toggle with default 'system' theme being set (INSERTED)

**Goal:** Add a light/dark/system theme toggle to the sidebar with system as the default. next-themes handles OS preference detection, localStorage persistence, and injects the .dark class on html. A single cycling icon button (Monitor/Sun/Moon) lives in the sidebar footer to the left of UserButton.
**Requirements**: n/a (UI enhancement)
**Depends on:** Phase 2
**Plans:** 1/1 plans complete

Plans:
- [ ] 02.2-01-PLAN.md — Install next-themes, create ThemeToggle component in packages/ui, wire ThemeProvider into __root.tsx, add ThemeToggle to AppSidebar footer

### Phase 02.1: Code Style & Form Patterns Refactor (INSERTED)

**Goal:** Migrate all 4 forms in apps/web to TanStack Form + Zod with the useAppForm
composition hook. Extract form JSX into dedicated sibling components (shell/form split).
Remove all per-field useState. Apply null categoryId pattern (eliminate __none__ sentinel).
Extract MerchantRuleRow from inline map(). No UX changes — pure internal refactor.
**Requirements**: n/a (internal code quality)
**Depends on:** Phase 2
**Plans:** 4/4 plans complete

Plans:
- [x] 02.1-01-PLAN.md — Foundation: install @tanstack/react-form + zod-form-adapter, create packages/ui/src/components/form.tsx (useAppForm), add 4 form schemas to packages/validators with tests
- [x] 02.1-02-PLAN.md — AccountSheet refactor: chrome/form split, loading gate for async co-owners, TanStack Form with ownership + memberIds as form fields
- [x] 02.1-03-PLAN.md — CategoryDialog + RuleDialog refactor: custom picker binding (D-08), null categoryId with Radix Select bridge, cross-field regex validator on blur
- [x] 02.1-04-PLAN.md — HouseholdSettings refactor (D-07) + MerchantRuleRow extraction (D-11)

### Phase 02.1.1: Audit and migrate to neon-serverless per Neon best practices (INSERTED)

**Goal:** Swap `packages/db` from `postgres.js` + `drizzle-orm/postgres-js` to `@neondatabase/serverless` (WebSocket mode) + `drizzle-orm/neon-serverless`. Enable Neon compute scale-to-zero. No schema changes, no API changes, no route changes.
**Requirements**: D-01 through D-09 (see 02.1.1-CONTEXT.md)
**Depends on:** Phase 02.1
**Plans:** 1/1 plans complete

Plans:
- [x] 02.1.1-01-PLAN.md — Driver swap: package.json deps, client.ts rewrite, client.test.ts mock update, route audit

### Phase 03.1: Transaction Schema & Migrations

**Goal:** The transactions data model is fully defined in the database with all
type-specific columns, join tables, and indexes in place. No API or UI work —
this phase is the schema gate that 03.2–03.4 depend on.

**Delivers:**
- `transactions` table with all nullable type-specific columns and `deleted_at` soft-delete timestamp
- `transaction_assignees` join table
- Partial index on `deleted_at IS NULL` (all queries exclude soft-deleted rows)
- `(org_id, account_id)` composite index
- `recurring_template_id` column reserved (generation logic deferred to v2)
- Zod discriminated unions for all 6 transaction types added to `@ploutizo/validators`

**Plans:** 2/2 plans complete

Plans:
- [x] 03.1-01-PLAN.md — Drizzle schema: transactions + transaction_assignees tables, indexes, migrations
- [x] 03.1-02-PLAN.md — Zod discriminated unions for all 6 transaction types in @ploutizo/validators

**Requirements covered:**
- §4 Transactions (schema foundation)

**Success criteria:**
- [ ] Migration runs cleanly against a fresh database with no errors
- [ ] `transactions` table has all 6 type-specific nullable column groups and `deleted_at`
- [ ] Partial index on `deleted_at IS NULL` confirmed via `\d transactions` in psql

---

### Phase 03.2: Transaction API

**Goal:** All six transaction types can be created, read, updated, and soft-deleted
via the API with correct field enforcement, split math, and validation errors.

**Delivers:**
- CRUD endpoints for all 6 types: expense, refund, income, transfer, settlement, contribution
- Per-type field validation via Zod discriminated unions; missing required fields return 400 with structured error
- Split sum validation: API validates that submitted assignee amounts sum to transaction amount (calculation is client-side per D-01)
- Refund: optional `refund_of` FK; reduces net category spend, not income
- Transfer: excluded from budget/expense/income calculations
- Soft delete via `deleted_at` timestamp; all queries filter via partial index
- `badRequest()` helper
- All SUM aggregates cast to `bigint`

**Plans:** 3/3 plans complete

Plans:
- [x] 03.2-01-PLAN.md — Test scaffold: 12 TXN-* Vitest stubs for all transaction route behaviors
- [x] 03.2-02-PLAN.md — badRequest() helper + POST + GET list + GET single (joined response, pagination, filtering, sort)
- [x] 03.2-03-PLAN.md — PATCH + DELETE (soft delete) + route registration in apps/api/src/index.ts

**Requirements covered:**
- §4 Transactions (API layer)

**Success criteria:**
- [ ] All 6 transaction types can be created; missing required fields return 400 with structured error (e.g. expense without category, income without income type)
- [ ] A transaction with assignees whose amountCents do not sum to transaction amount returns 400 BAD_REQUEST
- [ ] A transaction with assignees whose amountCents sum to transaction amount is created successfully (LRM calculation is client-side per D-01; Phase 03.4)
- [ ] Soft-deleted transactions are excluded from all balance, budget, and category spend calculations
- [ ] A refund linked to an original expense reduces net category spend (not income); unlinked refund also reduces category spend
- [ ] Transfer transactions are excluded from budget spend and income summary totals

---

### Phase 03.2.1: household improvement (new UI with settings consolidation and invitation flow) (INSERTED)

**Goal:** Consolidate the separate Household and Members settings tabs into a single unified page. Add member invitation (POST /api/households/invitations via Clerk REST API) and member removal (DELETE /api/households/members/:memberId). Household overview with org avatar, member list with avatars and remove confirmations, inline invite form.
**Requirements**: D-01 through D-20 (see 03.2.1-CONTEXT.md)
**Depends on:** Phase 03.2
**Plans:** 3/3 plans complete

Plans:
- [x] 03.2.1-01-PLAN.md — Wave 0: Install Avatar and Sonner shadcn components into packages/ui
- [x] 03.2.1-02-PLAN.md — Wave 1: API routes (GET /, POST /invitations, DELETE /members/:memberId) + members query bug fix + data-access hooks
- [x] 03.2.1-03-PLAN.md — Wave 2: Rewrite HouseholdSettings.tsx (3 sections) + remove Members tab + delete dead files

### Phase 03.3: Transaction List UI

**Goal:** Users can view all transactions in a paginated, filterable list and
soft-delete individual entries.

**Delivers:**
- Transaction list DataGrid with pagination
- Filter bar (Filters component): type, date range, account, category, assignee, tags
- Date range selector
- Soft-delete action
- `formatCurrency(cents)` utility used at display layer only
- React Query `QueryClient` with Clerk bearer token injection; `onSettled` invalidation pattern established

**Plans:** 3/4 plans executed

Plans:
- [x] 03.3-01-PLAN.md — Wave 0: Add failing tests for restore route and sort=type/category/account
- [x] 03.3-02-PLAN.md — Wave 2: API patch (restore endpoint, expand sort axes, fix formatCurrency)
- [x] 03.3-03-PLAN.md — Wave 1: Install ReUI Filters + create data-access hooks (get/delete/restore)
- [ ] 03.3-04-PLAN.md — Wave 3: Route + Transactions page shell + TransactionsTable + sidebar nav

**Requirements covered:**
- §4 Transactions (list view)

**Success criteria:**
- [ ] Soft-deleted transactions are absent from the transaction list immediately after deletion — no page refresh required (React Query invalidation)
- [ ] Filter by type, date range, account, category, assignee, and tag each narrow the list correctly; combinations of filters are AND-ed

---

### Phase 03.4: Transaction Forms UI

**Goal:** Users can create and edit any of the six transaction types through a
single form that conditionally renders the correct fields per type.

**Delivers:**
- Per-type form with conditional field rendering
- Split UI: assignee picker, % or $ toggle, even-split default
- Refund linker: optional `refund_of` field pre-fills original split
- Tag picker with inline create
- Transaction edit: any field editable post-creation; original imported values preserved and visible in edit view

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 3.4 to break down)

**Requirements covered:**
- §4 Transactions (create/edit forms)

**Success criteria:**
- [ ] Switching transaction type in the form clears type-specific fields from the previous type and shows the correct fields for the new type
- [ ] Any field on a posted transaction can be edited; original description from import is preserved and visible in edit view

---

### Phase 03.5: CI testing, linting, and formatting checks (INSERTED)

**Goal:** [Urgent work - to be planned]
**Requirements**: TBD
**Depends on:** Phase 03.4
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 03.5 to break down)

### Phase 4.1: Settlement API

**Goal:** The API can compute settlement balances at query time for any household
and return per-account, per-member breakdown including net settlement lines.

**Delivers:**
- Running balance computation at query time (no materialization)
- Settlement card data endpoint: per-account header with total balance + per-member rows
- Net settlement line logic: when member A and member B have opposing balances across accounts
- Composite indexes to support balance queries

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 4.1 to break down)

**Requirements covered:**
- §5 Settlement (API layer)

**Success criteria:**
- [ ] Settlement card endpoint returns correct per-member balance immediately after a new expense transaction is added
- [ ] "Each person pays their own" account does not appear in any settlement card response
- [ ] When member A owes member B on one account and member B owes member A on another, the net settlement line is present; when debt flows only one direction, the line is absent

---

### Phase 4.2: Settlement UI

**Goal:** Household members can see what they owe each other and record full or
partial settlements from the UI.

**Delivers:**
- Per-account settlement cards: header with total balance, per-member rows, "Settle" CTA
- Negative balance displayed as green credit ("Emily is owed $X")
- "Settle" form: defaults to outstanding balance, overridable for partial settlement; records `settlement` transaction type
- Settlement reminder threshold settings: member setting > household setting > $50 default (stored; notifications triggered in Phase 7.1)

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 4.2 to break down)

**Requirements covered:**
- §5 Settlement (UI layer)

**Success criteria:**
- [ ] Member with a negative balance (overpaid) is shown as "Name is owed $X" in green, not as a negative number
- [ ] Partial settlement records a `settlement` transaction for the partial amount; outstanding balance reflects the remainder immediately

---

### Phase 4.3: Budgets API

**Goal:** Budgets can be created and managed per category; the API computes spend
against each budget and handles rollover.

**Delivers:**
- Budget CRUD endpoints: household-wide budgets per category, monthly default, weekly/bi-weekly/yearly/custom date range
- Spend calculation: SUM of expenses in category per period, cast to `bigint`
- Budget status thresholds: On Track < 80%, Caution 80–99%, Over ≥ 100%
- Budget rollover: surplus only, capped at 1× base limit; `effective_limit_cents` stored per period

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 4.3 to break down)

**Requirements covered:**
- §6 Budgets (API layer)

**Success criteria:**
- [ ] Budget spend correctly sums only expense transactions in that category within the period; transfers, income, and settlements are excluded
- [ ] Budget with rollover enabled carries forward surplus (not overspend) to the next period; accumulated surplus never exceeds 1× the base limit

---

### Phase 4.4: Budget Dashboard UI

**Goal:** Users can view all category budgets with spend progress, status
indicators, and historical period navigation from a single dashboard.

**Delivers:**
- Budget dashboard: summary row + per-category DataGrid with progress bars
- On Track (blue) / Caution (amber) / Over (red) status badges
- Historical view by period

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 4.4 to break down)

**Requirements covered:**
- §6 Budgets (UI layer)

**Success criteria:**
- [ ] Budget dashboard shows On Track / Caution / Over status with correct colour coding at exact 80% and 100% thresholds
- [ ] Historical period navigation loads spend data for the selected period without a full page reload

---

### Phase 5.1: Bank Normalizers

**Goal:** Pure-function normalizers exist for all supported bank CSV formats with
full fixture-based test coverage. No DB or UI dependencies — this phase can be
merged and tested in isolation.

**Delivers:**
- Pure-function normalizers for: TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine, EQ Bank, and ploutizo normalized format
- Amex CA sign inversion (positive = expense)
- Bank-specific date parsers (CIBC/EQ Bank: `YYYY-MM-DD`; all others: `MM/DD/YYYY`)
- BOM stripping on all CSV inputs
- Format auto-detection with unrecognized-format error

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 5.1 to break down)

**Requirements covered:**
- §8 CSV Import (normalizer layer)

**Success criteria:**
- [ ] Amex CA CSV: a row with positive amount `234.80` is parsed as a $234.80 expense (not income)
- [ ] CIBC CSV: a date formatted `2026-01-15` is parsed correctly; a TD CSV with date `01/15/2026` is parsed correctly
- [ ] Uploading a CSV from an unrecognized bank format returns the unrecognized-format error

---

### Phase 5.2: Import Batch API

**Goal:** The API can receive a parsed import batch, apply merchant rules, detect
duplicates, and write only confirmed rows to the database.

**Delivers:**
- Batch creation endpoint
- Row validation with merchant rule application on import preview
- Duplicate detection: `external_id` exact match (primary); Levenshtein distance < 0.2 on pre-normalized description filtered by date + amount (secondary)
- `import_batches` record with source bank, date, row count, account reference
- Batch finalize endpoint: writes only confirmed (non-deleted, non-skipped) rows
- Individual transactions retain `import_batch_id`

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 5.2 to break down)

**Requirements covered:**
- §8 CSV Import (API layer)
- §9 Merchant Rules (rule application during import — CRUD was Phase 2)

**Success criteria:**
- [ ] Merchant rule match applied automatically on import preview; description is renamed and category pre-filled per rule; user can override the category without affecting the rule
- [ ] Import batch record saved with source bank, date, row count, and account reference; each imported transaction has non-null `import_batch_id`

---

### Phase 5.3: Import UI

**Goal:** Users can upload a CSV, step through a review table with inline editing,
and resolve unmatched accounts before confirming the import.

**Delivers:**
- Stepper component: upload → review → confirm
- FileUpload component
- Import review DataGrid with inline editing: description, category, assignee, account, tags per row
- Row status badges
- Account resolution: unmatched account → dropdown; "Create new account" inline dialog; propagates to all unresolved rows in session

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 5.3 to break down)

**Requirements covered:**
- §8 CSV Import (UI layer)

**Success criteria:**
- [ ] Unmatched account cell renders as dropdown; selecting "Create new account" opens inline dialog; on confirm the new account is assigned to the current row and silently pre-selected in all other unresolved account dropdowns in the same session

---

### Phase 5.4: Import Bulk Actions & Duplicate Handling

**Goal:** Users can efficiently process large import batches via bulk actions and
have duplicate rows surfaced and skippable before confirming.

**Delivers:**
- Bulk actions: select all/deselect all, bulk-assign category, bulk-assign assignee
- "Skip all duplicates" toggle; duplicate rows unchecked by default
- Duplicate row visual treatment: strikethrough, amber highlight
- Rows deleted during review are never written to DB

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 5.4 to break down)

**Requirements covered:**
- §8 CSV Import (bulk actions and duplicate handling)

**Success criteria:**
- [ ] A duplicate row (matching `external_id`) appears unchecked in the import review table; enabling "Skip all duplicates" unchecks all duplicate rows
- [ ] A row deleted during review is absent from the DB after confirming import — confirmed by checking transaction count before and after

---

### Phase 6.1: Investment Schema & Contribution Room API

**Goal:** The API can track TFSA, RRSP, and FHSA contribution room per member
and fire over-contribution warnings on contribution entry.

**Delivers:**
- `investment_accounts` table: types TFSA, RRSP, FHSA, RESP, non-registered, other
- `contribution_room_settings` table
- TFSA room calculation from `TFSA_ANNUAL_LIMITS` constant in `packages/types` (verify 2026 limit against CRA before shipping)
- RRSP: manual room entry ("from your NOA or CRA My Account"); app tracks contributions against it
- FHSA: $8,000/year from account open year; carry-forward from prior year only (capped at $8,000, does not compound); $40,000 lifetime cap
- Over-contribution warnings for TFSA and FHSA on contribution entry (same request/mutation response)
- Member `birth_year` stored as private profile field; never visible to other household members

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 6.1 to break down)

**Requirements covered:**
- §7 Savings & Investments (schema and API layer)

**Success criteria:**
- [ ] Member born in 1991 who has made $20,000 in contributions sees the correct remaining TFSA room (cumulative limit 1991→2026 minus $20,000); member born in 2000 sees room starting from 2018 (age 18)
- [ ] FHSA carry-forward: if member contributed $4,000 in year 1, carry-forward to year 2 is $4,000 (capped at $8,000); carry-forward does not compound into year 3
- [ ] `birth_year` is absent from any API response accessible to other household members

---

### Phase 6.2: Savings Contributions UI

**Goal:** Members can record contributions, track remaining room with a progress
indicator, and see over-contribution warnings inline.

**Delivers:**
- Contribution create form (pre-typed as `contribution` transaction)
- Remaining room progress indicator per account type
- Over-contribution warning display on the contribution form
- TFSA disclaimer: "Your CRA room may differ due to withdrawals made in prior years or years of non-residency"
- Birth year prompt (stored as private profile field)

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 6.2 to break down)

**Requirements covered:**
- §7 Savings & Investments (contributions UI)

**Success criteria:**
- [ ] TFSA over-contribution warning fires immediately on the contribution form when entered amount would exceed remaining room; same behavior for FHSA
- [ ] TFSA disclaimer is visible on the TFSA account view; no manual withdrawal adjustment field exists

---

### Phase 6.3: Net Worth API

**Goal:** The API can compute a household's real-time net worth snapshot and store
monthly historical data points.

**Delivers:**
- Net worth real-time snapshot: assets (chequing + savings + cash + investments as contributions) minus liabilities (credit cards)
- Per-member and household-level breakdowns
- Monthly historical snapshots (computed on first view of historical period, stored for subsequent loads)

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 6.3 to break down)

**Requirements covered:**
- §10 Net Worth (API layer)

**Success criteria:**
- [ ] Net worth total = sum of chequing + savings + cash + investment contribution totals − credit card balances
- [ ] Per-member breakdown correctly assigns accounts to their owner(s)

---

### Phase 6.4: Net Worth UI

**Goal:** Members can view their household's net worth, per-member breakdown, and
monthly historical trend in a single page.

**Delivers:**
- Net worth page: total, account breakdown, per-member section
- Historical trend chart
- Investment value disclaimer ("contribution totals — not market value")

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 6.4 to break down)

**Requirements covered:**
- §10 Net Worth (UI layer)

**Success criteria:**
- [ ] Investment section is clearly labeled "contribution totals — not market value"
- [ ] Per-member breakdown assigns net worth to the member(s) who own each account

---

### Phase 7.1: Notifications Table & Write Triggers

**Goal:** Notification rows are written to the database whenever a budget
threshold is crossed, a contribution exceeds room, or a settlement balance
exceeds a member's threshold.

**Delivers:**
- `notifications` table schema
- Write logic called from budget mutation (80% caution + 100% over; neither re-fires until budget resets)
- Write logic called from contribution mutation (TFSA + FHSA over-contribution)
- Write logic called from settlement balance check (persists until balance drops below threshold)
- Threshold precedence: member setting > household setting > $50 default
- January contribution room refresh reminder logic

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 7.1 to break down)

**Requirements covered:**
- §11 Notifications & Alerts (data layer)

**Success criteria:**
- [ ] Adding a transaction that pushes a budget from 79% to 81% creates a budget caution notification; pushing it to 100% creates an over-budget notification; neither fires again until the budget resets
- [ ] Recording a contribution that exceeds TFSA room creates an over-contribution notification immediately on the same request
- [ ] A member with a settlement balance of $60 on a household with $50 threshold (no member-level override) sees a settlement reminder; a member who sets their own threshold to $100 does not see the reminder at $60

---

### Phase 7.2: Notification Feed UI

**Goal:** Users can view all pending notifications in an in-app feed and dismiss
them individually or all at once.

**Delivers:**
- Bell icon in header with unread count badge; fetch-based on page load — no websockets
- Notification feed panel with type icons per notification
- Dismiss individual notification
- "Dismiss all" clears entire feed
- January contribution room refresh reminder displayed in feed

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 7.2 to break down)

**Requirements covered:**
- §11 Notifications & Alerts (UI layer)

**Success criteria:**
- [ ] Dismissing a notification removes it from the feed; "Dismiss all" clears the entire feed
- [ ] On January 1, a contribution room refresh reminder appears for members who have tracked TFSA or FHSA accounts

---

### Phase 8.1: Replace in-memory seenOrgs Set in tenantGuard

**Goal:** Replace the process-lifetime `seenOrgs` Set cache in `tenantGuard` with a durable solution that works across multiple processes/instances and doesn't rely on a safety-net upsert on every cold start.

**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 8.1 to break down)

**Context:** The `seenOrgs` Set was added as a cheap fix to avoid a DB round-trip on every request (the upsert safety net for when the Clerk `organization.created` webhook fails to deliver). Options: (1) configure reliable webhook delivery in all environments — ngrok/Clerk tunnel for local, verified secret + endpoint for prod — making the upsert unnecessary; (2) if multi-process, use a shared cache (Redis/Upstash) instead of the in-process Set. Current approach resets on cold start, which is safe but not ideal long-term.

---

### Phase 8.2: Adopt react-i18next and wrap all user-visible string literals

**Goal:** Eliminate all hardcoded string literals in JSX. Route all user-visible text through `react-i18next`'s `useTranslation` hook with feature-namespaced locale JSON files.

**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 8.2 to break down)

**Context:** Library already chosen (`react-i18next`). Strings go in locale JSON files keyed by feature namespace (e.g. `public/locales/en/accounts.json`). Deferred from STANDARDS.md planned refactors — applies to all features once the translation layer is established.

---

## Coverage Map

| REQUIREMENTS.md Section | Phase | Notes |
|--------------------------|-------|-------|
| §1 Households & Users | Phase 1 (infra/seeds) + Phase 2 (full feature) | Clerk native org config in Phase 1; creation/switching UI and Clerk-managed invitation flow in Phase 2 |
| §2 Accounts | Phase 2 | Full CRUD including "each person pays their own" flag |
| §3 Categories & Tags | Phase 2 | Full CRUD; default seed list present after Phase 1 org creation |
| §4 Transactions | Phases 03.1–03.4 | Schema (03.1), API (03.2), list UI (03.3), create/edit forms (03.4) |
| §5 Settlement | Phases 4.1–4.2 | API (4.1), UI (4.2) |
| §6 Budgets | Phases 4.3–4.4 | API (4.3), dashboard UI (4.4) |
| §7 Savings & Investments | Phases 6.1–6.2 | Schema + contribution room API (6.1), contributions UI (6.2) |
| §8 CSV Import | Phases 5.1–5.4 | Normalizers (5.1), batch API (5.2), review UI (5.3), bulk actions (5.4) |
| §9 Merchant Rules | Phase 2 (CRUD) + Phase 5.2 (application during import) | Seed scripts in Phase 1 |
| §10 Net Worth | Phases 6.3–6.4 | API (6.3), UI (6.4) |
| §11 Notifications & Alerts | Phases 7.1–7.2 | Write triggers (7.1), feed UI (7.2) |
| Infrastructure requirements | Phase 1 | Clerk satellites, postgres.js, tenantGuard, Tailwind v4 audit |

---

## Deferred (Post-Milestone)

| Item | Reason |
|------|--------|
| Recurring transactions — generation logic | Schema column (`recurring_template_id`) reserved in Phase 3.1; generation logic deferred to v2 |
| AI auto-fill on import | v2 — no ML infrastructure in v1 |
| Manual CSV column mapping | v2 — bank-specific normalizers only in v1 |
| Per-member budgets | v2 — household-wide only in v1 |
| Multi-currency | v2 — CAD only in v1 |
| Live investment balance / brokerage API | v2 — contribution totals only in v1 |
| Receipt scanning | Explicitly excluded |
| Mobile app | Web only |
| Public API | Not in scope |
| Per-member household visibility restrictions | All members see everything in v1 |
| Net worth market value | Contribution totals only in v1 |
| TFSA withdrawal manual adjustment | Disclaimer only in v1 |
| FHSA "used for home purchase" status | Deferred — account freeze on home purchase not in v1 scope |
| Recurring transaction reminders | v2 |

## Open Items (must resolve before affected phase)

| Item | Blocks | Action |
|------|--------|--------|
| TFSA 2026 annual limit | Phase 6.1 | Verify at CRA website before implementing `TFSA_ANNUAL_LIMITS` constant |
| RRSP 2025/2026 dollar cap | Phase 6.1 | Verify exact cap at CRA website |
| Bank CSV column names (TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine, EQ Bank) | Phase 5.1 | Collect real bank export files; treat SUMMARY.md signatures as starting point only |
| Cloudflare proxy setting for `clerk.ploutizo.app` | Phase 1 | Must be "DNS only" (grey cloud) — document in deployment runbook |
| ReUI Tailwind v4 compatibility | Phase 3.3 | Verify `DataGrid` and `Filters` compatibility at https://reui.io/docs before building transaction list |
| Neon connection limits on chosen plan tier | Phase 1 | Verify plan limit vs postgres.js pool `max` before production launch |
