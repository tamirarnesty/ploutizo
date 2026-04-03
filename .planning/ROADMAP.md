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

### Phase 02.3: vercel skills audit and guidelines (INSERTED)

**Goal:** [Urgent work - to be planned]
**Requirements**: TBD
**Depends on:** Phase 02
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 02.3 to break down)

### Phase 02.2: add light/dark/system theme toggle with default 'system' theme being set (INSERTED)

**Goal:** [Urgent work - to be planned]
**Requirements**: TBD
**Depends on:** Phase 2
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 02.2 to break down)

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

**Goal:** [Urgent work - to be planned]
**Requirements**: TBD
**Depends on:** Phase 02.1
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 02.1.1 to break down)

### Phase 3: Transactions

**Goal:** Users can create, view, edit, and soft-delete all six transaction types
with correct field enforcement, split math, and filtering. This is the core
data model all other features derive from.

**Delivers:**
- Transaction CRUD for all 6 types: expense, refund, income, transfer, settlement, contribution
- Per-type field validation enforced by Zod discriminated unions and returned as 400 on violation
- Split math: even default distribution, Largest Remainder Method for odd-cent remainder, customizable by % or $
- Soft delete (`deleted_at` timestamp); all queries exclude soft-deleted rows via partial index
- Transaction list with filters (type, date range, account, category, assignee, tags)
- Transaction edit: any field editable post-creation; original imported values preserved when present
- Refund: optional `refund_of` FK pre-fills original split; reduces net category spend, not income
- Transfer: excluded from budget/expense/income calculations
- `formatCurrency(cents)` utility used at display layer only
- React Query `QueryClient` with Clerk bearer token injection; `onSettled` invalidation pattern established
- All SUM aggregates cast to `bigint`

**Plans:**
1. Transaction schema & migrations — `transactions` table with all nullable type-specific columns, `transaction_assignees` join table, required partial indexes (`deleted_at IS NULL`), `(org_id, account_id)` composite index
2. Transaction API — CRUD endpoints for all 6 types, Zod discriminated unions in `@ploutizo/validators`, split calculation logic with Largest Remainder Method, `badRequest()` helper
3. Transaction list UI — DataGrid table with pagination, filter bar (Filters component), date range selector, soft-delete action
4. Transaction create/edit forms — per-type form with conditional field rendering, split UI (assignee picker, % or $ mode), refund linker, tag picker with inline create

**Requirements covered:**
- §4 Transactions (full feature)

**Success criteria:**
- [ ] All 6 transaction types can be created; missing required fields return 400 with structured error (e.g. expense without category, income without income type)
- [ ] A 3-assignee split on a $100.01 transaction distributes as $33.34 + $33.34 + $33.33 (Largest Remainder Method — first assignees get extra cent)
- [ ] Adding a second assignee to an existing 1-assignee transaction resets split to 50/50; removing one assignee from a 3-way split resets to 50/50
- [ ] Soft-deleted transactions are absent from the transaction list and from all balance, budget, and category spend calculations
- [ ] A refund linked to an original expense reduces net category spend (not income); unlinked refund also reduces category spend
- [ ] Transfer transactions are excluded from budget spend and income summary totals
- [ ] Any field on a posted transaction can be edited; original description from import is preserved and visible in edit view

---

### Phase 4: Settlement & Budgets

**Goal:** Household members can see exactly what they owe each other across all
shared accounts and record settlements, and can set budgets per category with
status tracking and rollover.

**Delivers:**
- Per-account settlement cards: header with total balance, per-member rows, "Settle" CTA
- Running balance computation at query time (no materialization)
- Net settlement line when two members have opposing balances across accounts
- Negative balance displayed as green credit ("Emily is owed $X")
- "Settle" form: defaults to outstanding balance, overridable for partial settlement; records `settlement` transaction type
- Settlement reminder threshold: member setting > household setting > $50 default (stored; notifications triggered in Phase 7)
- Household-wide budgets per category: monthly default, weekly/bi-weekly/yearly/custom date range
- Budget status thresholds: On Track < 80% (blue), Caution 80–99% (amber), Over ≥ 100% (red)
- Budget rollover: surplus only, capped at 1× base limit; `effective_limit_cents` stored per period
- Budget dashboard: summary row + per-category progress bars; historical view by period

**Plans:**
1. Settlement balance API — query-time balance computation with composite indexes, settlement card data endpoint, net settlement line logic
2. Settlement UI — settlement cards per account, "Settle" CTA form, net settlement display, negative balance as green credit, threshold settings
3. Budgets API — budget CRUD endpoints, spend calculation (SUM expenses in category per period cast to bigint), rollover computation with 1× cap, `effective_limit_cents` storage
4. Budget dashboard UI — summary row, per-category DataGrid with progress bars, status badges, historical period navigation

**Requirements covered:**
- §5 Settlement (full feature)
- §6 Budgets (full feature)

**Success criteria:**
- [ ] Settlement card shows correct per-member balance immediately after a new expense transaction is added — no page refresh required (React Query invalidation)
- [ ] "Each person pays their own" account does not appear in any settlement card
- [ ] When member A owes member B on one account and member B owes member A on another, a net settlement line appears; when debt flows only one direction, the line is absent
- [ ] Member with a negative balance (overpaid) is shown as "Name is owed $X" in green, not as a negative number
- [ ] Partial settlement records a `settlement` transaction for the partial amount; outstanding balance reflects the remainder immediately
- [ ] Budget spend for a category correctly sums only expense transactions in that category within the period; transfers, income, and settlements are excluded
- [ ] Budget with rollover enabled carries forward surplus (not overspend) to the next period; accumulated surplus never exceeds 1× the base limit
- [ ] Budget dashboard shows On Track / Caution / Over status with correct colour coding at exact 80% and 100% thresholds

---

### Phase 5: CSV Import

**Goal:** Users can import transactions from any major Canadian bank by uploading
a CSV export, review and correct the parsed rows, and confirm the import — with
automatic duplicate detection and merchant rule application.

**Delivers:**
- Bank format auto-detection and normalizers for: TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine, EQ Bank, and ploutizo normalized format
- Amex CA sign inversion handled explicitly (positive = expense)
- Bank-specific date parsers (CIBC/EQ Bank: `YYYY-MM-DD`; all others: `MM/DD/YYYY`)
- BOM stripping on all CSV inputs
- Import review table (DataGrid) with inline editing: description, category, assignee, account, tags per row
- Duplicate detection: `external_id` exact match (primary); Levenshtein distance < 0.2 on pre-normalized description filtered by date + amount (secondary)
- Duplicate rows unchecked by default; "Skip all duplicates" toggle
- Account resolution: unmatched account → dropdown; "Create new account" inline dialog; propagates to all unresolved rows in session
- Bulk actions: select all/deselect all, bulk-assign category, bulk-assign assignee, skip all duplicates
- Merchant rule application on import preview; user can override per row
- Import batch recorded; individual transactions retain `import_batch_id`
- Rows deleted during review are never written to DB

**Plans:**
1. Bank normalizers — pure-function normalizers per bank with fixture-based unit tests; BOM stripping; Amex sign inversion; bank-specific date parsers; format detection with unrecognized-format error
2. Import batch API — batch creation endpoint, row validation with merchant rule application, duplicate detection (two-signal), `import_batches` record, batch finalize endpoint that writes only confirmed rows
3. Import UI — Stepper component (upload → review → confirm), FileUpload component, import review DataGrid with inline editing, row status badges, account resolution dropdown with inline create
4. Import bulk actions & duplicate handling — select all/deselect, bulk category/assignee, skip-all-duplicates toggle, duplicate row visual treatment (strikethrough, amber)

**Requirements covered:**
- §8 CSV Import (full feature)
- §9 Merchant Rules (rule application during import — CRUD was Phase 2)

**Success criteria:**
- [ ] Amex CA CSV: a row with positive amount `234.80` is parsed as a $234.80 expense (not income)
- [ ] CIBC CSV: a date formatted `2026-01-15` is parsed correctly; a TD CSV with date `01/15/2026` is parsed correctly
- [ ] A duplicate row (matching `external_id`) appears unchecked in the import review table; enabling "Skip all duplicates" unchecks all duplicate rows
- [ ] Merchant rule match applied automatically on import preview; description is renamed and category pre-filled per rule; user can override the category without affecting the rule
- [ ] Unmatched account cell renders as dropdown; selecting "Create new account" opens inline dialog; on confirm the new account is assigned to the current row and silently pre-selected in all other unresolved account dropdowns in the same session
- [ ] A row deleted during review is absent from the DB after confirming import — confirmed by checking transaction count before and after
- [ ] Import batch record saved with source bank, date, row count, and account reference; each imported transaction has non-null `import_batch_id`
- [ ] Uploading a CSV from an unrecognized bank format surfaces a user-visible error message

---

### Phase 6: Savings, Investments & Net Worth

**Goal:** Members can track TFSA, RRSP, and FHSA contribution room, record
contributions, receive over-contribution warnings, and view a real-time net
worth snapshot with monthly historical trend.

**Delivers:**
- Investment account types: TFSA, RRSP, FHSA, RESP, non-registered, other
- TFSA room calculation from `TFSA_ANNUAL_LIMITS` constant (verify 2026 limit against CRA before shipping)
- RRSP: manual room entry ("from your NOA or CRA My Account"); app tracks contributions against it
- FHSA: $8,000/year from account open year; carry-forward from prior year only (capped at $8,000, does not compound); $40,000 lifetime cap
- Over-contribution warnings for TFSA and FHSA triggered on contribution entry (same request/mutation response)
- TFSA disclaimer: "Your CRA room may differ due to withdrawals made in prior years or years of non-residency" — no manual adjustment field
- Member `birth_year` stored as private profile field; never visible to other household members
- Net worth real-time snapshot: assets (chequing + savings + cash + investments as contributions) minus liabilities (credit cards)
- Per-member and household-level breakdowns
- Monthly historical snapshots (computed on first view of historical period, stored for subsequent loads)

**Plans:**
1. Investment schema & contribution room API — `investment_accounts`, `contribution_room_settings` tables; TFSA/FHSA/RRSP room calculation endpoints; `TFSA_ANNUAL_LIMITS` constant in `packages/types`; over-contribution warning logic
2. Savings contributions UI — contribution create form (pre-typed as `contribution` transaction), remaining room progress indicator, over-contribution warning display, TFSA disclaimer, birth year prompt
3. Net worth API — balance query (assets minus liabilities), per-member breakdown, monthly snapshot compute + store
4. Net worth UI — net worth page with total, account breakdown, per-member section, historical trend chart, investment value disclaimer ("contribution totals only")

**Requirements covered:**
- §7 Savings & Investments (full feature)
- §10 Net Worth (full feature)

**Success criteria:**
- [ ] Member born in 1991 who has made $20,000 in contributions sees the correct remaining TFSA room (cumulative limit 1991→2026 minus $20,000); member born in 2000 sees room starting from 2018 (age 18)
- [ ] FHSA carry-forward: if member contributed $4,000 in year 1, carry-forward to year 2 is $4,000 (capped at $8,000); carry-forward does not compound into year 3
- [ ] TFSA over-contribution warning fires immediately on the contribution form when entered amount would exceed remaining room; same behavior for FHSA
- [ ] TFSA disclaimer is visible on the TFSA account view; no manual withdrawal adjustment field exists
- [ ] Net worth total = sum of chequing + savings + cash + investment contribution totals − credit card balances; investment section is clearly labeled "contribution totals — not market value"
- [ ] Per-member breakdown assigns net worth to the member(s) who own each account
- [ ] `birth_year` is absent from any API response that is accessible to other household members

---

### Phase 7: Notifications

**Goal:** Users are proactively alerted in-app when budgets approach or exceed
their limit, when contribution room is exceeded, and when settlement balances
require attention — without requiring them to check every page manually.

**Delivers:**
- In-app notification feed (bell icon); fetch-based on page load — no websockets
- Budget caution alert (80%) and over-budget alert (100%) — written to `notifications` table when thresholds are crossed on transaction create/edit
- TFSA and FHSA over-contribution warning notification — also written on contribution entry
- Settlement reminder: persists until balance drops below threshold; threshold precedence enforced (member > household > $50)
- January contribution room refresh reminder
- Notifications dismissed individually or all at once

**Plans:**
1. Notifications table & write triggers — `notifications` schema, write logic called from budget mutation, contribution mutation, and settlement balance check; threshold precedence logic
2. Notification feed UI — bell icon with unread count badge, feed panel, notification items with type icons, dismiss actions, January reminder logic

**Requirements covered:**
- §11 Notifications & Alerts (full feature)

**Success criteria:**
- [ ] Adding a transaction that pushes a budget from 79% to 81% used creates a budget caution notification; adding another that pushes it to 100% creates an over-budget notification; neither fires again until the budget resets
- [ ] Recording a contribution that exceeds TFSA room creates an over-contribution notification immediately on the same request
- [ ] A member with a settlement balance of $60 on a household with $50 threshold (no member-level override) sees a settlement reminder; a member who sets their own threshold to $100 does not see the reminder at $60
- [ ] On January 1, a contribution room refresh reminder appears for members who have tracked TFSA or FHSA accounts
- [ ] Dismissing a notification removes it from the feed; "Dismiss all" clears the entire feed

---

## Coverage Map

| REQUIREMENTS.md Section | Phase | Notes |
|--------------------------|-------|-------|
| §1 Households & Users | Phase 1 (infra/seeds) + Phase 2 (full feature) | Clerk native org config in Phase 1; creation/switching UI and Clerk-managed invitation flow in Phase 2 |
| §2 Accounts | Phase 2 | Full CRUD including "each person pays their own" flag |
| §3 Categories & Tags | Phase 2 | Full CRUD; default seed list present after Phase 1 org creation |
| §4 Transactions | Phase 3 | All 6 types, splits, soft delete, filters, edit |
| §5 Settlement | Phase 4 | Query-time balance, settlement cards, net settlement line, partial settlement |
| §6 Budgets | Phase 4 | Per-category budgets, rollover with 1× cap, dashboard, historical |
| §7 Savings & Investments | Phase 6 | TFSA/RRSP/FHSA room tracking, contributions, over-contribution warnings |
| §8 CSV Import | Phase 5 | 8 bank normalizers + ploutizo format, review table, duplicate detection |
| §9 Merchant Rules | Phase 2 (CRUD) + Phase 5 (application during import) | Seed scripts in Phase 1 |
| §10 Net Worth | Phase 6 | Real-time snapshot, per-member breakdown, monthly historical |
| §11 Notifications & Alerts | Phase 7 | Budget, contribution, settlement, and January reminders |
| Infrastructure requirements | Phase 1 | Clerk satellites, postgres.js, tenantGuard, Tailwind v4 audit |

---

## Backlog

### Phase 999.1: Adopt react-i18next and wrap all user-visible string literals (BACKLOG)

**Goal:** Eliminate all hardcoded string literals in JSX. Route all user-visible text through `react-i18next`'s `useTranslation` hook with feature-namespaced locale JSON files.

**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

**Context:** Library already chosen (`react-i18next`). Strings go in locale JSON files keyed by feature namespace (e.g. `public/locales/en/accounts.json`). Deferred from STANDARDS.md planned refactors — applies to all features once the translation layer is established.

---

## Deferred (Post-Milestone)

| Item | Reason |
|------|--------|
| Recurring transactions — generation logic | Schema column (`recurring_template_id`) reserved in Phase 3; generation logic deferred to v2 |
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

---

## Open Items (must resolve before affected phase)

| Item | Blocks | Action |
|------|--------|--------|
| TFSA 2026 annual limit | Phase 6 | Verify at CRA website before implementing `TFSA_ANNUAL_LIMITS` constant |
| RRSP 2025/2026 dollar cap | Phase 6 | Verify exact cap at CRA website |
| Bank CSV column names (TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine, EQ Bank) | Phase 5 | Collect real bank export files; treat SUMMARY.md signatures as starting point only |
| Cloudflare proxy setting for `clerk.ploutizo.app` | Phase 1 | Must be "DNS only" (grey cloud) — document in deployment runbook |
| ReUI Tailwind v4 compatibility | Phase 3 | Verify `DataGrid` and `Filters` compatibility at https://reui.io/docs before building transaction list |
| Neon connection limits on chosen plan tier | Phase 1 | Verify plan limit vs postgres.js pool `max` before production launch |
