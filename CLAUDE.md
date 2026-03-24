# ploutizo — Agent Context

Personal finance tracker. Helps users track accounts, transactions, budgets, and
financial goals across one or more organisations (tenants).

---

## Repo Structure

Scaffolded via `pnpm dlx shadcn@latest init -t start --monorepo --preset b5cRMQsEM`,
then extended with `apps/api` and additional packages.

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

### Package import rules

| Package | Imported by | Never by |
|---|---|---|
| `@ploutizo/ui` | `apps/web` only | `apps/api` |
| `@ploutizo/db` | `apps/api` only | `apps/web` |
| `@ploutizo/validators` | `apps/web` + `apps/api` | — |
| `@ploutizo/types` | `apps/web` + `apps/api` | — |

These boundaries are enforced by pnpm workspace `dependencies` declarations —
`apps/api` does not declare `@ploutizo/ui` as a dependency so it cannot import it,
and `apps/web` does not declare `@ploutizo/db`.

---

## Stack

| Layer        | Choice                              |
|--------------|-------------------------------------|
| Frontend     | TanStack Start + TypeScript         |
| UI Components| shadcn/ui + ReUI (`@ploutizo/ui`)   |
| Styling      | Tailwind CSS v4                     |
| Icons        | Lucide React                        |
| Data Fetch   | React Query (TanStack Query)        |
| Auth         | Clerk (orgs = tenants)              |
| API          | Hono                                |
| ORM          | Drizzle                             |
| Database     | Neon — serverless Postgres 16       |
| Runtime      | Node 22 LTS                         |
| Package mgr  | pnpm + Turborepo                    |
| Testing      | Vitest + Testing Library            |
| Hosting      | Railway (web + api, single project) |
| DNS / CDN    | Cloudflare (free plan)              |

---

## Component Library Rules

All UI is built using shadcn/ui and ReUI — never from raw HTML primitives.

### Priority order
1. **ReUI** — use when ReUI has the component. ReUI is shadcn-based and provides richer, production-ready versions of common patterns.
2. **shadcn/ui** — use for primitives not covered by ReUI.
3. **Never** build a UI component from scratch with raw HTML/CSS if a shadcn or ReUI equivalent exists.

### ReUI component usage
| ReUI Component | Use for |
|---|---|
| `DataGrid` | All data tables — transactions list, import review table |
| `Filters` | Table filter bars — transaction list, import review |
| `FileUpload` | CSV file upload on import page |
| `Autocomplete` (async) | Category, account, tag, assignee selectors; account resolution dropdown |
| `Stepper` | Import page multi-step flow (upload → review → confirm) |
| `DateSelector` | Date pickers, date range filters |

ReUI docs: https://reui.io/docs

---

## Commands

```bash
pnpm dev              # start all apps in parallel (Turborepo)
pnpm build            # full build — runs in dependency order
pnpm typecheck        # tsc across all packages
pnpm lint             # eslint across all packages
pnpm test             # vitest run across all packages
pnpm test:watch       # vitest watch mode
pnpm db:generate      # drizzle-kit generate (from packages/db)
pnpm db:migrate       # drizzle-kit migrate (from packages/db)
pnpm db:push          # drizzle-kit push — dev/preview only
```

---

## Data Model

Core entities — schema lives in `packages/db/schema/`. Full ERD available in `docs/erd.html`.

### Schema file structure
```
packages/db/schema/
  enums.ts          # all pgEnums — shared across domain files
  auth.ts           # users, orgs, org_members, invitations
  accounts.ts       # accounts, account_members
  classification.ts # categories, tags, merchant_rules, merchant_rule_tags
  imports.ts        # import_batches
  recurring.ts      # recurring_templates
  transactions.ts   # transactions, transaction_assignees, transaction_tags
  budgets.ts        # budgets
  investments.ts    # investment_accounts, contribution_room_settings
  notifications.ts  # notifications
  relations.ts      # all Drizzle relations (centralised to avoid circular imports)
  index.ts          # barrel — re-exports everything
```

### Key naming conventions
- `orgs` — the tenancy unit (user-facing term: "household"). Short, consistent with `org_id`.
- `org_members` — members of an org.
- `users.externalId` — the auth provider's user ID. Named provider-agnostically (not `clerkId`).

### Seed Scripts
Default data for new orgs lives in `packages/db/seeds/`. Two seed functions are called at org creation:
- `seedOrgCategories(orgId)` — inserts default categories with the org's `org_id`
- `seedOrgMerchantRules(orgId)` — inserts default merchant rules with the org's `org_id`
- `seedOrg(orgId)` — convenience wrapper that calls both (use this in the org creation handler)

All seeded rows are fully tenant-scoped (`org_id` non-nullable on all tables). No global seed rows in the DB. New seed entries do not propagate to existing orgs.

### Seed Scripts
Default data for new households lives in `packages/db/seeds/`. Two seed functions are called at household creation:
- `seedHouseholdCategories(orgId)` — inserts default categories with the household's `org_id`
- `seedHouseholdMerchantRules(orgId)` — inserts default merchant rules with the household's `org_id`

All seeded rows are fully tenant-scoped (`org_id` is non-nullable on all tables). There are no global seed rows in the DB. New entries in seed scripts do not propagate to existing households.

---

## Multi-Tenancy Rules

These are invariants. Never violate them.

1. `orgId` is **always** sourced from the verified Clerk JWT context in Hono middleware — never from query params, path params, or request body.
2. Every Drizzle query that reads or writes tenant data **must** include `.where(eq(table.orgId, orgId))`.
3. `DATABASE_URL` exists only in `apps/api` environment variables — `apps/web` has no database access.
4. If a route handler is missing the tenant guard, treat it as a bug and add it.

---

## API Conventions (`apps/api`)

### Middleware order (applied globally)
1. `cors()` — allow `ploutizo.app` origin only (and `localhost:3000` in dev)
2. `clerkMiddleware()` — verify RS256 JWT, attach `{ userId, orgId, orgRole }` to context
3. `tenantGuard()` — return `401` if `orgId` is null

### Route structure
- Group routes by resource: `app.route('/accounts', accountsRouter)`
- Each router file lives at `apps/api/src/routes/<resource>.ts`
- Handlers are arrow functions, named exports

### Request validation
- Always parse request body with the corresponding Zod schema from `@ploutizo/validators`
- Return `400` with a structured error body on validation failure — use a shared `badRequest()` helper

### Response shape
```ts
// success
{ data: T }

// error
{ error: { code: string; message: string; details?: unknown } }
```

### Error handling
- Use `neverthrow` `Result<T, E>` for functions that can fail in expected ways (DB queries, external calls)
- Throw only for truly unexpected/unrecoverable errors
- Map `Result` errors to HTTP responses at the route handler layer — keep error logic out of business logic

---

## Frontend Conventions (`apps/web`)

### Data fetching
- All server data fetched via React Query (`useQuery`, `useMutation`)
- API base URL from `VITE_API_URL` env var — never hardcoded
- Bearer token injected via a shared query client default configured in `src/lib/queryClient.ts`
- No direct `fetch` calls outside of `src/lib/api/` — all API calls go through typed client functions

### Components
- Named exports only — no default exports on custom components
- Functional components with arrow functions
- Co-locate component, styles (Tailwind only), and test in same folder:
  ```
  src/components/TransactionList/
  ├── TransactionList.tsx
  └── TransactionList.test.tsx
  ```
- No `useEffect` where a React primitive exists (`useMemo`, `useCallback`, derived state, `useRef`, etc.)
- Use `useEffect` only for genuine side effects with no React-native alternative (e.g. external subscriptions, imperative DOM APIs)

### Component library hierarchy
Always prefer in this order — never build from scratch with raw HTML what already exists:
1. **ReUI components** (`@reui/*`) — for complex data-heavy UI. Installed into `packages/ui` via shadcn CLI.
2. **shadcn/ui components** (`@ploutizo/ui`) — for all standard UI primitives.
3. **Custom components** — only when neither ReUI nor shadcn covers the need.

#### ReUI components in use
| Component | Package | Used for |
|---|---|---|
| `DataGrid` | `@reui/data-grid` | Transaction list table, import review table |
| `Filters` | `@reui/filters` | Transaction list filter bar |
| `FileUpload` | `@reui/file-upload` | CSV import upload step |
| `Autocomplete` | `@reui/autocomplete` | Async search — accounts, categories, merchants |
| `Stepper` | `@reui/stepper` | CSV import multi-step flow |
| `DateSelector` | `@reui/date-selector` | Transaction date picker, filter date ranges |

Install via: `pnpm dlx shadcn@latest add @reui/<component>` from `apps/web`.

### Styling
- Tailwind CSS utility classes only — no inline styles, no CSS modules, no styled-components
- Follow Tailwind conventions: responsive prefixes (`sm:`, `lg:`), state variants (`hover:`, `focus:`)
- Component variants via `cva` (class-variance-authority)
- No `style={{}}` props on any element

### Auth
- Use `useAuth()` and `useOrganization()` from `@clerk/tanstack-start` for session/tenant context
- Active org set via `setActive({ organization })` on org switch
- Never store JWT in component state — always read from Clerk session

---

## Coding Style

- **Arrow functions** for all functions — no `function` keyword except where a framework explicitly requires it
- **Named exports** everywhere — no default exports on custom code
- **TypeScript strict mode** on across all packages — no `any`, no `@ts-ignore` without an explanatory comment
- **Zod schemas** defined in `@ploutizo/validators`, never inline in route handlers or components
- Prefer `const` — never `let` unless reassignment is genuinely required
- Avoid early mutation — prefer derived values and immutable transforms

---

## Testing

### Stack
- **Vitest** for all unit and integration tests
- **Testing Library** (`@testing-library/react`) for component tests
- Test files co-located with source: `Foo.test.tsx` next to `Foo.tsx`, `foo.test.ts` next to `foo.ts`

### Rules
- Every new function and component ships with tests
- **Do not mock pure functions** — test them directly with inputs and outputs
- Only mock what cannot be relied upon in the test environment or is part of the test scenario:
  - External HTTP calls (Clerk, Neon, any third-party)
  - Non-deterministic values (dates, random IDs) — use `vi.setSystemTime()` / `vi.fn()`
  - Environment variables
- Avoid over-mocking — if you find yourself mocking most of a module, reconsider the design
- Prefer `it('does X when Y')` naming — behaviour-first, not implementation-first
- Separate `describe` blocks per logical unit or scenario group

### What to test
| Layer | What |
|---|---|
| `packages/validators` | Zod schemas — valid + invalid inputs |
| `packages/db` | Query builder helpers — unit test SQL shape, integration test against Neon branch |
| `apps/api` route handlers | Request → response shape, auth rejection, tenant isolation |
| `apps/web` components | Render output, user interactions, loading/error states |
| `apps/web` hooks | Behaviour under different query states |

---

## Branch Conventions

Format: `<prefix>/<short-kebab-description>`

| Prefix | Use |
|---|---|
| `feature/` | New user-facing functionality |
| `major/` | Breaking changes or large architectural shifts |
| `minor/` | Small improvements or non-breaking additions |
| `fix/` | Bug fixes |
| `chore/` | Tooling, deps, config — no production code change |
| `docs/` | Documentation only |

Examples: `feature/transaction-list`, `fix/tenant-guard-null-orgid`, `chore/upgrade-drizzle`

- Branch names are lowercase kebab-case — no underscores, no uppercase
- Keep descriptions concise (2–4 words max)
- One concern per branch — don't mix feature work with chore work

---

## Things Claude Should Never Do

- Import `@ploutizo/ui` in `apps/api` — UI package is web-only
- Import `@ploutizo/db` in `apps/web`
- Build a UI component from raw HTML/CSS if a shadcn or ReUI equivalent exists — always check ReUI first, then shadcn
- Build UI components from raw HTML when a shadcn or ReUI component already covers the need
- Use shadcn's basic `Table` when `DataGrid` from ReUI is available and the data is tabular
- Use a plain `<input type="file">` when `FileUpload` from ReUI is available
- Use `any` without a `// reason:` comment explaining why
- Add a default export to a custom component or utility
- Write inline styles (`style={{}}`) — use Tailwind
- Source `orgId` from request body or params — always from JWT context
- Write a DB query without a tenant `WHERE` clause on tenant-scoped tables
- Use `useEffect` where a React primitive would suffice
- Mock a pure function in tests
- Hardcode `api.ploutizo.app` or any URL — use env vars
- Define Zod schemas inline in route handlers or components — they go in `@ploutizo/validators`
- Store seed data as nullable `org_id` rows in the DB — use seed scripts in `packages/db/seeds/` instead
- Allow `org_id` to be nullable on any table — all rows are fully tenant-scoped
- Name the auth provider ID `clerkId` or any provider-specific name — use `externalId`
