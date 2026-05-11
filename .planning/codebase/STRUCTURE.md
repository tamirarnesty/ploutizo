# Codebase Structure

**Analysis Date:** 2026-05-11

## Directory Layout

```
ploutizo/                          # Monorepo root
├── apps/
│   ├── api/                       # Hono HTTP API (Node.js)
│   │   └── src/
│   │       ├── index.ts           # Server entry point — middleware + route mounting
│   │       ├── types.ts           # AppEnv (typed Hono context)
│   │       ├── middleware/        # CORS, Clerk, tenantGuard, webhookAuth
│   │       ├── routes/            # One file per resource domain
│   │       ├── services/          # Business logic (one file per resource)
│   │       └── lib/
│   │           ├── queries/       # Drizzle query functions (one file per resource)
│   │           ├── errors.ts      # DomainError, NotFoundError
│   │           ├── validator.ts   # appValidator (Hono + Zod wrapper)
│   │           └── settlement-due-date.ts
│   └── web/                       # TanStack Start React SPA
│       └── src/
│           ├── start.ts           # TanStack Start + Clerk server middleware
│           ├── router.tsx         # TanStack Router creation
│           ├── routeTree.gen.ts   # Auto-generated route tree (DO NOT EDIT)
│           ├── routes/            # File-based routes
│           ├── components/        # Feature-scoped UI components
│           ├── hooks/             # Shared React hooks
│           └── lib/
│               ├── queryClient.ts # QueryClient singleton + apiFetch helper
│               └── data-access/   # TanStack Query hooks (one dir per resource)
├── packages/
│   ├── db/                        # Neon Postgres client + Drizzle schema
│   │   └── src/
│   │       ├── index.ts           # Exports db client + schema barrel
│   │       ├── client.ts          # Pool + drizzle() — imported by apps/api ONLY
│   │       ├── schema/            # Drizzle table definitions
│   │       │   ├── index.ts       # Schema barrel
│   │       │   ├── enums.ts       # pgEnum definitions
│   │       │   ├── auth.ts        # users, orgs, orgMembers
│   │       │   ├── accounts.ts    # accounts table
│   │       │   ├── classification.ts # categories, tags
│   │       │   ├── transactions.ts   # transactions, transactionAssignees, transactionTags
│   │       │   └── import-batches.ts
│   │       └── drizzle/           # Migration SQL files (generated)
│   ├── ui/                        # Shared component library
│   │   └── src/
│   │       ├── components/        # shadcn + ReUI components + custom
│   │       │   └── reui/          # ReUI base components — DO NOT MODIFY
│   │       ├── hooks/             # Shared UI hooks
│   │       ├── lib/               # Utility functions
│   │       └── styles/            # Global CSS (Tailwind v4)
│   ├── validators/                # Zod schemas shared by web + API
│   │   └── src/
│   │       ├── index.ts           # Barrel export
│   │       ├── transactions.ts    # createTransactionSchema (discriminated union)
│   │       ├── accounts.ts
│   │       ├── categories.ts
│   │       ├── tags.ts
│   │       ├── household.ts
│   │       ├── merchant-rules.ts
│   │       ├── settlements.ts
│   │       └── shared.ts
│   └── types/                     # Shared TypeScript types
│       └── src/
│           └── index.ts
├── .planning/                     # GSD planning artifacts (not shipped)
│   ├── codebase/                  # Codebase map documents (this directory)
│   ├── phases/                    # Phase plan documents
│   ├── debug/                     # Debug session notes
│   └── mockups/                   # UI mockup references
├── .claude/                       # Claude Code config + skills
├── .agents/                       # Agent skill definitions
├── drizzle.config.ts              # Drizzle Kit config (root-level, for migration CLI)
├── turbo.json                     # Turborepo pipeline
├── pnpm-workspace.yaml            # Workspace package globs
├── package.json                   # Root scripts
├── tsconfig.json                  # Root TypeScript config (extended by packages)
└── vitest.workspace.ts            # Vitest workspace config
```

## Directory Purposes

**`apps/api/src/routes/`:**
- Purpose: HTTP handler registration per resource
- Contains: One `.ts` file per domain (`accounts.ts`, `transactions.ts`, `settlements.ts`, `categories.ts`, `tags.ts`, `households.ts`, `merchant-rules.ts`, `health.ts`, `webhooks.ts`)
- Key files: `transactions.ts` (most complex — 6 transaction types)

**`apps/api/src/services/`:**
- Purpose: Business logic and domain rule enforcement
- Contains: Mirrors `routes/` — one file per resource
- Key files: `transactions.ts` (split validation, refund ownership, counterpart checks)

**`apps/api/src/lib/queries/`:**
- Purpose: Drizzle query construction and execution; no business logic
- Contains: One file per resource, named query builder/executor functions
- Key files: `transactions.ts` (complex filter + join queries)

**`apps/api/src/middleware/`:**
- Purpose: Hono middleware
- Key files: `tenantGuard.ts` (org extraction + upsert), `webhookAuth.ts` (Svix signature verification)

**`apps/web/src/routes/`:**
- Purpose: File-based TanStack Router route definitions
- Contains: `__root.tsx` (providers, auth guards), `_layout.tsx` (sidebar shell), feature routes
- Pattern: `_layout.*` prefix = under the sidebar layout; settings routes are nested under `_layout.settings/`
- Key files: `__root.tsx`, `_layout.tsx`, `_layout.transactions.tsx`, `_layout.accounts.tsx`, `_layout.dashboard.tsx`

**`apps/web/src/components/`:**
- Purpose: Feature-scoped UI components
- Contains: Subdirectory per feature (`transactions/`, `accounts/`, `categories/`, `dashboard/`, `members/`, `onboarding/`, `settings/`)
- Top-level files: `AppSidebar.tsx`, `TopBar.tsx`, `AppLogo.tsx`

**`apps/web/src/lib/data-access/`:**
- Purpose: All server state — TanStack Query hooks and fetch functions
- Contains: One subdirectory per API resource; each has `queries.ts`, `use*.ts` files, `index.ts` barrel
- Subdirectories: `accounts/`, `categories/`, `household/`, `merchant-rules/`, `org/`, `tags/`, `transactions/`

**`packages/ui/src/components/`:**
- Purpose: Shared design system components
- Base shadcn components: `button.tsx`, `dialog.tsx`, `sheet.tsx`, `select.tsx`, etc. — override via `className`, never modify source
- ReUI components: `reui/` subdirectory — never modify
- Custom components: `form.tsx` (`useAppForm`), `text.tsx`, `theme-toggle.tsx`, `theme-provider.tsx`

**`packages/db/src/schema/`:**
- Purpose: Drizzle table definitions and PostgreSQL enum definitions
- Generated migrations: `packages/db/drizzle/` — do not edit manually

## Key File Locations

**Entry Points:**
- `apps/api/src/index.ts`: Hono server entry — middleware order, route mounting, error handler
- `apps/web/src/start.ts`: TanStack Start server entry — Clerk server middleware
- `apps/web/src/router.tsx`: TanStack Router instance creation
- `apps/web/src/routes/__root.tsx`: Root route — provider tree, auth guards, `TokenInitializer`

**Configuration:**
- `apps/web/src/lib/queryClient.ts`: QueryClient config (staleTime 60s) + `apiFetch` + `setTokenGetter`
- `packages/db/src/client.ts`: Neon WebSocket pool initialization — `neonConfig.webSocketConstructor` must be set before Pool
- `drizzle.config.ts`: Drizzle Kit configuration for migrations
- `turbo.json`: Build/test/lint pipeline

**Core Logic:**
- `apps/api/src/middleware/tenantGuard.ts`: Multi-tenancy enforcement — reads `orgId` from Clerk
- `apps/api/src/lib/validator.ts`: `appValidator` — standardized Zod validation middleware
- `apps/api/src/lib/errors.ts`: `DomainError`, `NotFoundError` — throw in services, caught in `app.onError`
- `apps/api/src/types.ts`: `AppEnv` — type for Hono context variables

**Schema:**
- `packages/db/src/schema/auth.ts`: `users`, `orgs`, `orgMembers`
- `packages/db/src/schema/transactions.ts`: `transactions`, `transactionAssignees`, `transactionTags`
- `packages/db/src/schema/accounts.ts`: `accounts`
- `packages/db/src/schema/classification.ts`: `categories`, `tags`
- `packages/db/src/schema/enums.ts`: `transactionTypeEnum`, `incomeTypeEnum`, `memberRoleEnum`

**Validators:**
- `packages/validators/src/transactions.ts`: `createTransactionSchema` — discriminated union for 6 transaction types
- `packages/validators/src/index.ts`: Barrel export for all schemas

**Testing:**
- `apps/api/src/__tests__/`: API integration tests
- `packages/db/src/__tests__/`: DB package tests
- `packages/validators/src/__tests__/`: Validator unit tests
- `vitest.workspace.ts`: Root Vitest workspace config

## Naming Conventions

**Files:**
- Route files: `_layout.<feature>.tsx` for sidebar-layout routes; `__root.tsx` for root
- Nested route dirs: `_layout.<feature>/` for subroutes (e.g., `_layout.settings/`)
- Component files: PascalCase (`TransactionsTable.tsx`, `AppSidebar.tsx`)
- Hook files: camelCase prefixed `use` (`useGetTransactions.ts`, `useCreateAccount.ts`)
- Query files: `queries.ts` per resource in `data-access/`
- API files: kebab-case (`merchant-rules.ts`, `settlement-due-date.ts`)
- Schema files: kebab-case (`import-batches.ts`, `auth.ts`)

**Directories:**
- Data-access domains: lowercase singular (`accounts/`, `transactions/`, `household/`)
- Component domains: lowercase plural (`transactions/`, `accounts/`)
- Packages: kebab-case (`packages/db`, `packages/validators`)

## Where to Add New Code

**New API resource (e.g., `budgets`):**
1. Schema: `packages/db/src/schema/budgets.ts` — define Drizzle table; export from `packages/db/src/schema/index.ts`
2. Migration: run `pnpm --filter @ploutizo/db db:generate && pnpm --filter @ploutizo/db db:migrate`
3. Validator: `packages/validators/src/budgets.ts` — define Zod schema; export from `packages/validators/src/index.ts`
4. API queries: `apps/api/src/lib/queries/budgets.ts`
5. API service: `apps/api/src/services/budgets.ts`
6. API route: `apps/api/src/routes/budgets.ts` — mount in `apps/api/src/index.ts` as `app.route('/api/budgets', budgetsRouter)`
7. Web data-access: `apps/web/src/lib/data-access/budgets/` — create `queries.ts`, `use*.ts` hooks, `index.ts` barrel
8. Web components: `apps/web/src/components/budgets/`
9. Web route: `apps/web/src/routes/_layout.budgets.tsx`

**New component in existing feature:**
- Implementation: `apps/web/src/components/<feature>/MyComponent.tsx`
- If reusable across features: `packages/ui/src/components/my-component.tsx`
- Never modify `packages/ui/src/components/reui/` — override at usage site via `className`

**New TanStack Query hook:**
- Location: `apps/web/src/lib/data-access/<resource>/use<Action><Resource>.ts`
- Export from `apps/web/src/lib/data-access/<resource>/index.ts`

**New Hono middleware:**
- Location: `apps/api/src/middleware/<name>.ts`
- Register in `apps/api/src/index.ts` in correct position (after CORS, after Clerk if org-aware)

**New shared type:**
- Location: `packages/types/src/index.ts` (or new file exported from there)

**New Zod schema:**
- Location: `packages/validators/src/<resource>.ts`
- Export from `packages/validators/src/index.ts`

**Utilities:**
- Web shared helpers: `apps/web/src/lib/` (new file, e.g., `formatters.ts`)
- API shared helpers: `apps/api/src/lib/` (new file)
- UI utilities: `packages/ui/src/lib/`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning artifacts — phase plans, codebase maps, debug notes, mockups
- Generated: No (human + AI authored)
- Committed: Yes

**`packages/db/drizzle/`:**
- Purpose: Drizzle Kit generated SQL migration files + `meta/` directory
- Generated: Yes (via `pnpm --filter @ploutizo/db db:generate`)
- Committed: Yes (migration history)

**`apps/web/.tanstack/`:**
- Purpose: TanStack Router generated temp files
- Generated: Yes
- Committed: No

**`apps/web/src/routeTree.gen.ts`:**
- Purpose: Auto-generated route tree from file-based routing
- Generated: Yes (by TanStack Router Vite plugin)
- Committed: Yes (required for type-safe routing)
- Action: DO NOT EDIT manually

**`apps/web/.output/`:**
- Purpose: TanStack Start build output
- Generated: Yes (via `pnpm turbo build`)
- Committed: No

---

*Structure analysis: 2026-05-11*
