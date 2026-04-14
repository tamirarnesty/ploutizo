# ploutizo

## What This Is

ploutizo (Greek: "to enrich") is a personal finance tracker for Canadian households. It helps household members track expenses, income, savings contributions, and budgets — with built-in support for shared expenses, real-time settlement balances, CSV import from major Canadian banks, and registered account (TFSA/RRSP/FHSA) contribution room tracking. Built as a web app, targeted at individuals and multi-member families in Canada.

## Core Value

Shared expense tracking across household members with real-time settlement balances — every member always knows exactly what they owe and to whom, without spreadsheets or manual calculation.

## Requirements

### Validated

**Phase 03.2.1 — Household Settings UI (2026-04-12)**
- [x] Household settings consolidated into single page (overview, members, settlement threshold)
- [x] Members list with avatars, You badge, role labels, remove flow with confirmation dialog
- [x] Invite member via email with toast feedback (success, already-member, pending, quota exceeded)
- [x] Self-removal guard enforced server-side
- [x] Members tab removed from settings nav; /settings/organization-members route deleted

### Active

**Households & Users**
- [ ] User can create a household with a user-chosen subdomain (immutable, 3–32 chars, unique, reserved slugs blocked)
- [ ] Household gets a random fun slug as the default suggestion at creation
- [ ] User can invite members to a household via email (7-day expiry, one pending invite per email per household)
- [ ] Invited user can accept or decline; new users are taken through sign-up first
- [ ] User with multiple households can switch via sidebar or direct subdomain navigation
- [ ] All household members see all household data (no per-member visibility restrictions in v1)
- [ ] All members are admins in v1 (role field reserved for future use)

**Accounts**
- [ ] User can create accounts of types: chequing, savings, credit card, prepaid/cash, e-transfer, investment, other
- [ ] Accounts can be personal (one owner) or shared (multiple owners)
- [ ] Accounts can be flagged as "each person pays their own" to exclude from settlement calculations
- [ ] Account fields: name, type, institution, last four digits, active/archived status

**Categories & Tags**
- [ ] Household gets a default seed list of categories on creation (Housing, Groceries, Dining Out, Transport, Health, Entertainment, Utilities, Subscriptions, Personal Care, Shopping, Other) — each with a Lucide icon
- [ ] User can add, rename, reorder, and archive categories (no deletion if transactions/budgets reference them)
- [ ] Categories have name, icon (Lucide name string), optional hex colour, sort order, active/archived status
- [ ] User can create household-scoped reusable tags with select-or-create-inline flow
- [ ] Tags can be applied to any transaction type; tags cannot be deleted if transactions reference them

**Transactions**
- [ ] User can create transactions of types: expense, refund, income, transfer, settlement, contribution
- [ ] Each type enforces its required fields at the application layer (Zod + API): expenses/refunds require category; income requires income type + source; transfers require from/to accounts
- [ ] Amounts stored as unsigned integer cents; direction implied by type, never by sign
- [ ] Transactions support splits across multiple assignees (evenly distributed by default; customizable by % or $)
- [ ] Adding/removing an assignee resets the split to even across the new count
- [ ] Refunds optionally link to original transaction (pre-fills original split as default); reduce net category spend, not income
- [ ] Transfers excluded from all budget/expense/income calculations
- [ ] Transactions support optional notes, tags, and import batch reference
- [ ] Transactions are soft-deleted after creation; hard-deleted only during import review (never written to DB)
- [ ] Any field on a transaction is editable after creation; original imported values preserved and shown

**Settlement**
- [ ] Per-account running balance: each member's outstanding balance = their split share total minus their recorded settlements on that account
- [ ] Settlement recorded as a transaction of type `settlement`; reduces running balance immediately
- [ ] Source account recorded on settlement transactions for CSV deduplication
- [ ] Net settlement display shown when two members have opposing balances across accounts
- [ ] Settlement card shows per-account balance with per-member rows and "Settle" CTA
- [ ] Settlement reminder threshold configurable: member setting > household setting > global default ($50)

**Budgets**
- [ ] Household-wide budgets per category per period (default monthly; supports weekly, bi-weekly, yearly, custom date range)
- [ ] Budget status thresholds: On Track (<80%), Caution (80–99%), Over (≥100%) — colour-coded
- [ ] Rollover: off by default; when enabled, surplus (not overspend) carries forward to next period
- [ ] Budget dashboard: summary row + per-category table with progress bars
- [ ] Historical budget performance viewable by period

**Savings & Investments**
- [ ] TFSA contribution room auto-calculated from member birth year + CRA annual limits (hardcoded per year)
- [ ] RRSP room set manually by user in v1; app tracks contributions against it
- [ ] FHSA room auto-calculated: $8,000/year, $40,000 lifetime cap, from account open date
- [ ] Over-contribution warnings for TFSA and FHSA
- [ ] Member birth year stored as private profile field (not visible to other household members)
- [ ] Tracks contributions only — not live portfolio balance

**CSV Import**
- [ ] Auto-detects major Canadian bank CSV formats: TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine, EQ Bank
- [ ] Also accepts ploutizo normalized CSV format directly
- [ ] Import review table with inline editing: description, category, assignee, account, tags per row
- [ ] Duplicate detection: date + amount + description (fuzzy) or `external_id` exact match — flagged rows unchecked by default
- [ ] Account resolution: unmatched account falls back to dropdown; "Create new account" inline dialog; propagates to all unresolved rows in session
- [ ] Assignee required before import finalises; settable per row or via bulk actions
- [ ] Bulk actions: select all/deselect all, bulk-assign category, bulk-assign assignee, skip all duplicates toggle
- [ ] Import batches recorded; individual transactions retain import batch reference
- [ ] Rows deleted during review are never written to DB

**Merchant Rules**
- [ ] Household-scoped auto-categorization rules applied during import and manual transaction creation
- [ ] Default seed rules inserted at org creation via `seedOrgMerchantRules(orgId)`
- [ ] Match types: exact, contains, starts with, ends with, regex
- [ ] Rules can set: rename to, category, assignee, tags; priority-ordered (first match wins)
- [ ] Users can add, edit, delete, and reorder rules

**Net Worth**
- [ ] Real-time net worth snapshot: assets (chequing, savings, cash, investments) minus liabilities (credit cards)
- [ ] Investment values = contribution totals only (not live market value)
- [ ] Per-member and household-level breakdowns
- [ ] Monthly historical snapshots

**Notifications**
- [ ] In-app notification feed (fetch-based on page load; no websockets in v1)
- [ ] Budget caution (80%) and over-budget alerts
- [ ] TFSA/FHSA over-contribution warnings
- [ ] Settlement reminders when balance exceeds threshold
- [ ] January contribution room refresh reminder

### Out of Scope

- Recurring transactions — deferred to v2 (template schema reserved but generation logic post-v1)
- AI auto-fill on import — deferred to v2
- Manual CSV column mapping — bank-specific normalizers only in v1
- Per-member budgets — household-wide only in v1
- Multi-currency — CAD only in v1
- Live investment balance / brokerage API integration — contributions only in v1
- Receipt scanning — explicitly excluded
- Mobile app — web only in v1
- Public API — not in scope
- Per-member household visibility restrictions — all members see everything in v1
- Fiscal year budgets — calendar year / custom periods only
- Net worth market value — contributions only

## Context

Planning is complete. Development is starting at Phase 1. The project uses a pnpm Turborepo monorepo scaffolded via `pnpm dlx shadcn@latest init -t start --monorepo --preset b5cRMQsEM`, then extended with `apps/api` (Hono) and `packages/db`, `packages/validators`, `packages/types`. Package import boundaries are enforced via pnpm workspace dependencies: `@ploutizo/ui` is web-only, `@ploutizo/db` is api-only, validators and types are shared.

Detailed feature requirements live in `REQUIREMENTS.md`. Full agent context in `CLAUDE.md`.

The Linear workspace has 31 issues across 4 projects (Phase 1–4) already created at linear.app/ploutizo.

## Constraints

- **Platform**: Web only — no mobile app in v1
- **Currency**: CAD only — no multi-currency in v1
- **Runtime**: Node 22 LTS — Node 20 reaches EOL April 2026
- **Hosting**: Railway hobby plan ($5/mo) — both web and api in one project
- **Auth/Tenancy**: Clerk — orgs as tenants; `orgId` always sourced from verified JWT, never from request params
- **Database**: Neon (Postgres 16) — `DATABASE_URL` in `apps/api` only; `apps/web` has no DB access
- **UI**: ReUI first, then shadcn/ui — never build from raw HTML if a component exists

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate Hono REST API instead of Server Actions | API is stable core (frontend stays replaceable); multi-tenancy enforcement centralised; independently testable | — Pending |
| Single flexible transactions table with nullable type-specific columns | Keeps queries and import flow simple; type enforcement at Zod/API layer | — Pending |
| Money stored as unsigned integer cents | Eliminates floating-point errors; direction implied by type, never by sign | — Pending |
| Clerk for auth + multi-tenancy (orgs = households) | Best-in-class multi-tenancy with RBAC, pre-built UI, official Hono middleware | — Pending |
| `users.external_id` not `clerkId` | Provider-agnostic naming — auth provider can change without schema rename | — Pending |
| Seed scripts per org at creation (not nullable global rows) | All rows fully tenant-scoped from birth; no cross-tenant data leakage risk | — Pending |
| ReUI + shadcn/ui component hierarchy | Never build from raw HTML; ReUI for complex data-heavy components, shadcn for primitives | — Pending |
| TanStack Start frontend | Full type safety end-to-end; native React Query integration; not Vercel-locked | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-14 — Phase 03.3.1 complete (API layering: AppEnv typed context, appValidator, DomainError/NotFoundError, query layer, service layer, webhookAuth middleware, thin route handlers)*
