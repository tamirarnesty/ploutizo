# ploutizo

**Personal Finance Tracker — Project Overview**

Last updated: March 2026  ·  Status: Planning complete, development starting

---

## 1. Project Overview

ploutizo (Greek: "to enrich") is a personal finance tracker for households. It helps members of a household track expenses, income, savings contributions, and budgets — with built-in support for shared expenses, settlement between members, and recurring transactions.

The product is built as a web app, with a focus on Canadian users. It supports CSV import from major Canadian banks, contribution room tracking for Canadian registered accounts (TFSA, RRSP, FHSA), and multi-member household management with shared expense settlement.

### Core Value Proposition

- Shared expense tracking across household members with real-time settlement balances
- CSV import from major Canadian banks with auto-categorisation via merchant rules
- Investment contribution room tracking for TFSA, RRSP, and FHSA accounts
- Budget management by expense category with rollover and threshold alerts
- Full transaction history with splits, tags, notes, and recurring transaction support

---

## 2. Project Details

| Detail | Value |
|---|---|
| Product name | ploutizo |
| Domain | ploutizo.app (subdomains per household) |
| Target users | Canadian households — individuals or multi-member families |
| Currency | CAD only (v1) |
| Platform | Web only (v1) |
| Status | Planning complete — development starting at Phase 1 |
| Repo | GitHub monorepo (TBD) |
| Linear workspace | linear.app/ploutizo |
| Team | Ploutizo (PLO) |

### Multi-tenancy Model

Every user belongs to one or more households. Each household is an "org" in the data model — all data is scoped to an `org_id`. Households have a unique subdomain (e.g. `arnesty.ploutizo.app`) chosen at creation and immutable after that. Members can switch between households via the sidebar or by navigating to the subdomain directly.

---

## 3. Features

### 3.1 In Scope — v1

#### Households & Users

- Multi-member households with shared data visibility
- Unique subdomain per household (user-chosen, immutable, with random fun default)
- Email-based invitations with 7-day expiry
- Household switching via sidebar or URL
- All members are admin in v1 (role field reserved for future)

#### Accounts

- Account types: chequing, savings, credit card, prepaid/cash, e-transfer, investment, other
- Personal (single owner) or shared (multiple owners) accounts
- Accounts can be excluded from settlement calculations ("each person pays their own")
- Institution, last four digits, and archived status

#### Categories & Tags

- Household-scoped categories with Lucide icons and hex colour
- Default seed list on org creation (Housing, Groceries, Dining Out, Transport, Health, Entertainment, Utilities, Subscriptions, Personal Care, Shopping, Other)
- Users can add, rename, reorder, archive categories
- Household-scoped reusable tags — freeform labels more granular than categories
- Tags use select-or-create-inline flow, can be applied in merchant rules

#### Transactions

- Transaction types: expense, refund, income, transfer, settlement, contribution
- Required fields vary by type — enforced at application layer (Zod + API)
- Income uses type (Direct Deposit, E-Transfer, Cash, Cheque, Other) + freeform source field instead of category
- Refunds reduce net category spend (not income) — optional link to original transaction
- Transfers have from/to accounts, excluded from all calculations
- Settlements are tagged bill payments that reduce shared account balances
- Splits: evenly distributed by default, reset on assignee add/remove, customisable by % or $ amount
- All amounts stored as unsigned integer cents — direction implied by type
- Soft delete after creation; hard delete only during import review
- Tags, notes, recurring template reference, import batch reference as optional fields

#### Settlement

- Per-account running balance — always real-time, never a period snapshot
- Settlement = bill payment typed as `settlement`, reduces running balance immediately
- Source account recorded for CSV deduplication across paired exports
- Net settlement display when two members have opposing balances across accounts
- Configurable reminder threshold: member setting > household setting > global default ($50)

#### Budgets

- Household-wide budgets per category per period
- Default monthly; supports weekly, bi-weekly, yearly, custom date range
- Rollover off by default — surplus (not overspend) carries forward when enabled
- Status thresholds: On Track (<80%), Caution (80–99%), Over (≥100%)
- Budget spend calculated from expense transactions in that category

#### Savings & Investments

- Tracks contributions — not live portfolio balance
- TFSA: contribution room auto-calculated from birth year + CRA annual limits
- RRSP: manual room override (v1)
- FHSA: $8,000/year, $40,000 lifetime cap — auto-calculated from account open date
- Over-contribution warnings
- Birth year stored privately per member (not visible to other household members)

#### CSV Import

- Auto-detects major Canadian bank formats: TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine, EQ Bank
- Also accepts ploutizo normalized CSV format directly
- Import review table with inline editing, duplicate flagging, bulk actions
- Duplicate detection: date + amount + description (fuzzy) or `external_id` exact match
- Account resolution dialog: select existing or create new account inline
- Import batches recorded for history and undo/rollback
- Rows deleted during review are never written to DB; post-import deletions are soft-deletes

#### Merchant Rules

- Household-scoped auto-categorisation rules applied during import and manual creation
- Seeded on org creation via seed scripts (not hardcoded, not nullable `org_id` rows)
- Match types: exact, contains, starts with, ends with, regex
- Can set: rename to, category, assignee, tags
- Priority-ordered — first match wins

#### Notifications

- In-app only (v1) — fetch-based on page load, no websockets
- Budget caution (80% used) and over alerts
- TFSA/FHSA over-contribution warnings
- Settlement reminders when balance exceeds threshold
- January contribution room refresh reminder

#### Net Worth

- Real-time snapshot: assets (chequing, savings, cash, investments) − liabilities (credit cards)
- Investment values = contribution totals only (not live market value)
- Per-member and household-level breakdowns
- Monthly historical snapshots

---

### 3.2 Planned — Post-v1

| Feature | Notes |
|---|---|
| Recurring transactions | Template-based; auto-generate on page load; stopped/active status |
| Recurring transaction reminders | Alert when expected recurring hasn't appeared by due date |
| AI auto-fill on import | Suggest category, merchant name, assignee; identify rule patterns |
| Manual CSV column mapping | Custom column mapping UI for unsupported bank formats |
| Per-member budgets | v1 is household-wide only |

---

### 3.3 Future / Backlog

| Item | Notes |
|---|---|
| Multi-currency | v1 is CAD only |
| Live investment balance | Brokerage API integration — contributions only in v1 |
| Net worth market value | Contributions only in v1 |
| Mobile app | Web only in v1 |
| Public API | Not in scope |
| Receipt scanning | Explicitly excluded |
| Per-member household visibility | All members see everything in v1 |
| "Edit all future" for recurring | Template propagation deferred to v2 |
| Fiscal year budgets | Calendar year / custom periods only in v1 |

---

## 4. Technical Decisions

### 4.1 Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | TanStack Start + TypeScript | Full type safety end-to-end, native React Query integration, explicit architecture, not Vercel-locked |
| UI Components | shadcn/ui + ReUI | shadcn for primitives; ReUI for DataGrid, Filters, FileUpload, Autocomplete, Stepper, DateSelector. Never build from raw HTML. |
| Styling | Tailwind CSS v4 | Utility-first, co-located with components, no CSS modules |
| Icons | Lucide React | Used in category icons and UI throughout |
| Data Fetch | React Query (TanStack Query) | Developer already familiar; native to TanStack Start; cache + mutation management |
| Auth | Clerk | Best-in-class multi-tenancy (orgs + RBAC), pre-built UI, official Hono middleware |
| API | Hono | Lightweight, TypeScript-first, edge-compatible, Express-like DX |
| ORM | Drizzle | TypeScript-native, lightweight, tight Neon integration |
| Database | Neon (Postgres 16) | Serverless Postgres, schema branching, generous free tier |
| Runtime | Node 22 LTS | Current active LTS; Node 20 reaches EOL April 2026 |
| Package mgr | pnpm + Turborepo | Monorepo workspace management, task caching |
| Testing | Vitest + Testing Library | Fast, native ESM, great for pnpm monorepos |
| Hosting | Railway | $5/mo hobby plan, both services in one project, GitHub auto-deploy |
| DNS / CDN | Cloudflare (free) | Nameservers, SSL, DDoS protection, static asset caching in front of Railway |

---

### 4.2 Architecture Decisions

#### Monorepo structure

Scaffolded via shadcn CLI (`pnpm dlx shadcn@latest init -t start --monorepo --preset b5cRMQsEM`), then extended. The shadcn CLI installs UI primitives into `packages/ui` automatically. Package namespacing uses `@ploutizo/*` throughout.

| Package | Imported by | Never by |
|---|---|---|
| `@ploutizo/ui` | `apps/web` only | `apps/api` |
| `@ploutizo/db` | `apps/api` only | `apps/web` |
| `@ploutizo/validators` | `apps/web` + `apps/api` | — |
| `@ploutizo/types` | `apps/web` + `apps/api` | — |

```
ploutizo/
├── apps/
│   ├── web/          # TanStack Start — SSR frontend, port 3000
│   └── api/          # Hono — REST API, port 8080
├── packages/
│   ├── ui/           # shadcn primitives + ploutizo compound components
│   ├── db/           # Drizzle schema, migrations, seeds, Neon client
│   ├── validators/   # Zod schemas — shared between web + api
│   └── types/        # Shared TypeScript interfaces + enums
├── CLAUDE.md
├── turbo.json
├── drizzle.config.ts
└── pnpm-workspace.yaml
```

#### Separate API — not Server Actions

A dedicated Hono REST API rather than TanStack Server Actions was chosen because: the API is the stable core (frontend stays replaceable), multi-tenancy enforcement is centralised, and the API is independently testable and deployable. React Query hits the REST API naturally.

#### Single flexible transaction table

All transaction types (expense, refund, income, transfer, settlement, contribution) live in one `transactions` table with nullable type-specific columns. Type-specific field requirements are enforced at the application layer (Zod + API), not via DB constraints. This keeps queries and the import flow simple.

#### Money stored as integer cents

All monetary values are stored as unsigned integer cents (e.g. `$234.80` → `23480`). Direction is implied by transaction type, never by sign. The sole exception is `transaction_assignees.percentage` which uses `numeric(5,2)` as it is a ratio, not a money value. Formatting happens only at the display layer via `formatCurrency(cents: number): string` in `@ploutizo/ui`.

#### Tenant isolation invariants

- `org_id` is always sourced from the verified Clerk JWT — never from request body or params
- Every Drizzle query on tenant-scoped tables includes `.where(eq(table.orgId, orgId))`
- `DATABASE_URL` exists only in `apps/api` environment variables
- `org_id` is non-nullable on every table — no global seed rows in the DB

#### Seed scripts — not nullable org_id rows

Default categories and merchant rules are inserted at org creation via seed scripts (`seedOrgCategories(orgId)`, `seedOrgMerchantRules(orgId)`, exposed as `seedOrg(orgId)`). Every seeded row gets a real `org_id` immediately. No global seed rows exist in the DB. New seed entries do not propagate to existing orgs.

#### externalId — not clerkId

`users.external_id` stores the auth provider's user ID, intentionally named provider-agnostically. If the auth provider changes from Clerk, this field remains semantically correct.

#### Component library priority

1. **ReUI** — use when ReUI has the component (DataGrid, Filters, FileUpload, Autocomplete, Stepper, DateSelector)
2. **shadcn/ui** — use for primitives not covered by ReUI
3. **Never** build a UI component from scratch with raw HTML/CSS

---

### 4.3 Database Schema

18 tables across 8 domain groups. Schema lives in `packages/db/schema/` split by domain:

| File | Tables |
|---|---|
| `auth.ts` | users, orgs, org_members, invitations |
| `accounts.ts` | accounts, account_members |
| `classification.ts` | categories, tags, merchant_rules, merchant_rule_tags |
| `transactions.ts` | transactions, transaction_assignees, transaction_tags |
| `recurring.ts` | recurring_templates |
| `imports.ts` | import_batches |
| `budgets.ts` | budgets |
| `investments.ts` | investment_accounts, contribution_room_settings |
| `notifications.ts` | notifications |
| `relations.ts` | All Drizzle relations (centralised to avoid circular imports) |

---

## 5. Build Plan

31 Linear issues across 4 projects. Priority is Phases 3 and 4 — the transactions page and CSV import page are the most important features. Phases 1 and 2 are prerequisites.

| Phase | Project | Milestones | Issues |
|---|---|---|---|
| 1 — Foundation | Phase 1 — Foundation | Monorepo Scaffold, DB Layer, API Skeleton, Web Skeleton | PLO-6 → PLO-19 |
| 2 — Core Data Layer | Phase 2 — Core Data Layer | Validators + Types, Accounts/Categories/Members APIs | PLO-20 → PLO-24 |
| 3 — Transactions | Phase 3 — Transactions | Transactions API, Transaction List UI, Transaction Create/Edit Form | PLO-25 → PLO-29 |
| 4 — CSV Import | Phase 4 — CSV Import | CSV Parser + Rule Engine, Import API, Import Review UI | PLO-30 → PLO-36 |

Starting point: **PLO-6** — run the shadcn scaffold command.

---

## 6. Resources

### 6.1 Linear

| Resource | URL |
|---|---|
| Linear workspace | linear.app/ploutizo |
| Phase 1 — Foundation | linear.app/ploutizo/project/phase-1-foundation-388939abd6a2 |
| Phase 2 — Core Data Layer | linear.app/ploutizo/project/phase-2-core-data-layer-8dcf72f6a603 |
| Phase 3 — Transactions | linear.app/ploutizo/project/phase-3-transactions-74991d902d84 |
| Phase 4 — CSV Import | linear.app/ploutizo/project/phase-4-csv-import-db68a12328c7 |

### 6.2 Stack & Tools

| Tool | URL |
|---|---|
| TanStack Start docs | tanstack.com/start |
| shadcn/ui docs | ui.shadcn.com/docs |
| shadcn monorepo setup | ui.shadcn.com/docs/monorepo |
| ReUI docs | reui.io/docs |
| ReUI DataGrid | reui.io/docs/radix/data-grid |
| ReUI Autocomplete (async) | reui.io/docs/radix/autocomplete#async-search |
| ReUI FileUpload | reui.io/docs/radix/file-upload |
| ReUI Stepper | reui.io/docs/radix/stepper |
| ReUI Filters | reui.io/docs/radix/filters |
| ReUI DateSelector | reui.io/docs/radix/date-selector |
| Hono docs | hono.dev |
| Drizzle ORM docs | orm.drizzle.team |
| Neon docs | neon.tech/docs |
| Clerk docs | clerk.com/docs |
| Railway docs | docs.railway.app |
| Turborepo docs | turbo.build/repo/docs |

### 6.3 Key Project Files

The following files were produced during planning and should be added to the repository root:

- `CLAUDE.md` — agent context file; read by Claude Code at the start of every session
- `REQUIREMENTS.md` — full living feature requirements document
- `packages/db/schema/` — complete Drizzle schema (18 tables, 11 files)

---

## 7. Coding Conventions

### 7.1 Style

- Arrow functions for all functions — no `function` keyword except where frameworks require it
- Named exports everywhere — no default exports on custom components or utilities
- TypeScript strict mode across all packages — no `any` without a `// reason:` comment
- Zod schemas in `@ploutizo/validators` only — never inline in route handlers or components
- `const` preferred; `let` only when reassignment is genuinely required

### 7.2 UI

- ReUI first, then shadcn — never build from raw HTML if a component exists
- Tailwind CSS only — no inline styles (`style={{}}`), no CSS modules
- Component variants via `cva` (class-variance-authority)
- No `useEffect` where a React primitive (`useMemo`, `useCallback`, derived state) would suffice

### 7.3 Testing

- Every new function and component ships with Vitest tests
- Do not mock pure functions — test them with real inputs and outputs
- Only mock: external HTTP calls, non-deterministic values (dates, IDs), env vars
- Prefer `it('does X when Y')` naming — behaviour-first

### 7.4 Branches

- Format: `<prefix>/<short-kebab-description>`
- Prefixes: `feature/`, `major/`, `minor/`, `fix/`, `chore/`, `docs/`
- Lowercase kebab-case only, 2–4 words, one concern per branch

---

## 8. Hard Rules (for Claude)

These are invariants. Violating them is a bug.

- Import `@ploutizo/ui` in `apps/api` — UI package is web-only
- Import `@ploutizo/db` in `apps/web`
- Build a UI component from raw HTML/CSS if a shadcn or ReUI equivalent exists
- Use `any` without a `// reason:` comment explaining why
- Add a default export to a custom component or utility
- Write inline styles (`style={{}}`) — use Tailwind
- Source `orgId` from request body or params — always from JWT context
- Write a DB query without a tenant `WHERE` clause on tenant-scoped tables
- Use `useEffect` where a React primitive would suffice
- Mock a pure function in tests
- Hardcode `api.ploutizo.app` or any URL — use env vars
- Define Zod schemas inline — they go in `@ploutizo/validators`
- Store seed data as nullable `org_id` rows — use seed scripts in `packages/db/seeds/`
- Allow `org_id` to be nullable on any table — all rows are fully tenant-scoped
- Name the auth provider ID `clerkId` — use `externalId`
