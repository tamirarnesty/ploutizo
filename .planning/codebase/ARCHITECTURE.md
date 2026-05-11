<!-- refreshed: 2026-05-11 -->
# Architecture

**Analysis Date:** 2026-05-11

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                          apps/web (SPA)                              │
│  TanStack Start + TanStack Router — React SPA, NOT Next.js/RSC      │
│                                                                      │
│  Routes             Components           Data Access                 │
│  `src/routes/`      `src/components/`    `src/lib/data-access/`      │
│                                                                      │
│  File-based routing  Feature-scoped       TanStack Query hooks       │
│  with _layout        components           + apiFetch to API          │
└─────────────────────┬───────────────────────────────────────────────┘
                      │  HTTPS + Bearer JWT (Clerk)
                      │  VITE_API_URL
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        apps/api (Hono)                               │
│                                                                      │
│  Middleware Stack         Routes                Services             │
│  CORS → Clerk JWT →       `src/routes/*.ts`     `src/services/*.ts`  │
│  tenantGuard              /api/*                                     │
│  `src/middleware/`        /health               `src/lib/queries/`   │
│                           /webhooks             DB query functions   │
└─────────────────────┬───────────────────────────────────────────────┘
                      │  Drizzle ORM
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   packages/db (Neon Serverless)                      │
│  WebSocket Pool + Drizzle schema                                     │
│  `packages/db/src/client.ts`                                        │
│  `packages/db/src/schema/`                                          │
└─────────────────────────────────────────────────────────────────────┘

Shared packages (consumed by both apps):
  packages/validators  — Zod schemas (shared web ↔ API)
  packages/types       — TypeScript types
  packages/ui          — shadcn + ReUI components, useAppForm hook
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `apps/web` | React SPA — routing, UI, data-access hooks | `apps/web/src/` |
| `apps/api` | Hono HTTP API — auth, validation, business logic | `apps/api/src/` |
| `packages/db` | Neon Postgres client + Drizzle schema | `packages/db/src/` |
| `packages/validators` | Zod schemas shared between web and API | `packages/validators/src/` |
| `packages/ui` | shadcn + ReUI base components, `useAppForm` | `packages/ui/src/` |
| `packages/types` | Shared TypeScript types | `packages/types/src/` |
| Root `tenantGuard` | Injects `orgId` into Hono context; upserts org row | `apps/api/src/middleware/tenantGuard.ts` |
| `apiFetch` | Typed fetch helper; attaches Clerk Bearer JWT | `apps/web/src/lib/queryClient.ts` |
| `TokenInitializer` | Wires `useAuth().getToken` into `apiFetch` at app init | `apps/web/src/routes/__root.tsx` |

## Pattern Overview

**Overall:** Monorepo with two deployable apps (SPA + API) sharing packages via pnpm workspace + Turborepo.

**Key Characteristics:**
- Strict separation: `packages/db` is imported by `apps/api` only — never by `apps/web`
- All server state in `apps/web` goes through TanStack Query hooks in `src/lib/data-access/`
- Multi-tenancy via Clerk orgs — `orgId` is extracted once in `tenantGuard` and set on Hono context
- API layers: route handler → service function → query function → Drizzle (`db`)
- Validation: `@ploutizo/validators` (Zod) used both in web forms and API route handlers

## Layers

**Web Routes:**
- Purpose: File-based route definitions; connect URL params to page components
- Location: `apps/web/src/routes/`
- Contains: `createFileRoute()` calls, route loaders (via `createServerFn`), `validateSearch`
- Depends on: Components, data-access hooks
- Used by: TanStack Router (generated `routeTree.gen.ts`)

**Web Components:**
- Purpose: Feature UI — forms, tables, sheets, dialogs
- Location: `apps/web/src/components/`
- Contains: Feature-scoped subdirectories (`transactions/`, `accounts/`, `categories/`, etc.)
- Depends on: `@ploutizo/ui`, `src/lib/data-access/`, `src/hooks/`
- Used by: Route components

**Data Access:**
- Purpose: All server state; TanStack Query hooks and `apiFetch` calls
- Location: `apps/web/src/lib/data-access/`
- Contains: One subdirectory per resource (`accounts/`, `transactions/`, `categories/`, `household/`, `merchant-rules/`, `org/`, `tags/`)
- Pattern: each subdirectory has `queries.ts` (raw fetch fns), `use*.ts` (query/mutation hooks), `index.ts` (barrel)
- Depends on: `apiFetch` from `src/lib/queryClient.ts`
- Used by: Components

**API Routes:**
- Purpose: HTTP handler registration; input parsing; validation; ownership checks
- Location: `apps/api/src/routes/`
- Contains: One file per resource domain (`accounts.ts`, `transactions.ts`, `settlements.ts`, etc.)
- Depends on: `appValidator`, services, `DomainError`
- Used by: Hono app in `apps/api/src/index.ts`

**API Services:**
- Purpose: Business logic; orchestrate DB operations; enforce domain rules
- Location: `apps/api/src/services/`
- Contains: One file per resource (`transactions.ts`, `accounts.ts`, `settlements.ts`, etc.)
- Depends on: `apps/api/src/lib/queries/` (Drizzle query functions), `@ploutizo/db`
- Used by: API route handlers

**API Query Functions:**
- Purpose: Drizzle query construction; raw DB operations
- Location: `apps/api/src/lib/queries/`
- Contains: One file per resource, exports named query builder/executor functions
- Depends on: `@ploutizo/db` (schema + client)
- Used by: Services only — routes never call query functions directly

**DB Package:**
- Purpose: Neon WebSocket pool + Drizzle ORM + schema definitions
- Location: `packages/db/src/`
- Contains: `client.ts` (pool + `db` export), `schema/` (table definitions)
- Depends on: `@neondatabase/serverless`, `drizzle-orm`
- Used by: `apps/api` only

## Data Flow

### Primary API Request Path

1. React component calls TanStack Query hook (`apps/web/src/lib/data-access/*/use*.ts`)
2. Query function calls `apiFetch` with Bearer JWT (`apps/web/src/lib/queryClient.ts:27`)
3. Request hits Hono app — CORS → Clerk JWT verification → `tenantGuard` middleware (`apps/api/src/index.ts:64`)
4. `tenantGuard` injects `orgId` into Hono context (`apps/api/src/middleware/tenantGuard.ts`)
5. Route handler validates input via `appValidator` (`apps/api/src/lib/validator.ts`)
6. Route handler calls service function (`apps/api/src/services/*.ts`)
7. Service calls query functions (`apps/api/src/lib/queries/*.ts`)
8. Query functions execute Drizzle operations against Neon (`packages/db/src/client.ts`)
9. Response flows back: JSON `{ data: ... }` shape

### Auth & Org Setup Flow

1. User signs in via Clerk (`apps/web/src/routes/sign-in.$.tsx`)
2. `authGuard` server fn runs at root route `beforeLoad` — redirects unauthenticated users (`apps/web/src/routes/__root.tsx:21`)
3. `orgGuard` server fn checks active org — redirects to `/onboarding` if missing (`apps/web/src/routes/__root.tsx:28`)
4. `TokenInitializer` component wires `useAuth().getToken` into `apiFetch` once at app mount (`apps/web/src/routes/__root.tsx:39`)
5. On org creation, Clerk fires webhook → `POST /webhooks/clerk` → `dispatchWebhookEvent` → upserts org/member rows in DB (`apps/api/src/routes/webhooks.ts`)

### Mutation Flow (Create/Update/Delete)

1. Component calls TanStack Query mutation hook (`use*.ts` in `data-access/`)
2. Mutation fn calls `apiFetch` with `method: 'POST'/'PATCH'/'DELETE'` + JSON body
3. API validates body against shared Zod schema (`@ploutizo/validators`)
4. Service runs domain checks, then executes DB transaction via Drizzle
5. On success, mutation hook calls `queryClient.invalidateQueries` to refresh cache

**State Management:**
- All server state: TanStack Query (`queryClient` singleton in `apps/web/src/lib/queryClient.ts`)
- URL state: TanStack Router search params (e.g., `transactionSearch.ts` for filter/sort/pagination)
- No Redux, Zustand, or React Context for data state
- Theme: `ThemeProvider` from `@ploutizo/ui` (localStorage `"theme"` key)

## Key Abstractions

**`apiFetch`:**
- Purpose: Typed HTTP client; attaches Clerk JWT; throws on non-OK
- Location: `apps/web/src/lib/queryClient.ts:27`
- Pattern: `apiFetch<ResponseType>('/api/resource', options?)` — all web-to-API calls use this

**`appValidator`:**
- Purpose: Zod validation middleware for Hono routes; returns project error shape on failure
- Location: `apps/api/src/lib/validator.ts`
- Pattern: `appValidator('json', schema)` as route middleware; typed via `c.req.valid('json')`

**`DomainError` / `NotFoundError`:**
- Purpose: Throwable errors in services; caught by `app.onError` in `index.ts`
- Location: `apps/api/src/lib/errors.ts`
- Pattern: services `throw new DomainError(statusCode, message)` — routes never construct response bodies for domain errors

**`tenantGuard`:**
- Purpose: Extracts `orgId` from Clerk JWT; blocks requests without active org; upserts org row
- Location: `apps/api/src/middleware/tenantGuard.ts`
- Pattern: Applied to `/api/*` only; sets `c.get('orgId')` for downstream handlers

**`AppEnv`:**
- Purpose: Typed Hono context variables — `{ Variables: { orgId: string } }`
- Location: `apps/api/src/types.ts`
- Pattern: All sub-routers typed as `new Hono<AppEnv>()` (except `webhooksRouter`)

**`useAppForm`:**
- Purpose: Project-wide TanStack Form composition hook; replaces raw `useForm`
- Location: `packages/ui/src/components/form.tsx`
- Pattern: `useAppForm({ defaultValues, validators })` — never use `useState` for form fields

## Entry Points

**Web SPA:**
- Location: `apps/web/src/routes/__root.tsx`
- Triggers: TanStack Start server boots; root route renders `RootDocument` with providers
- Responsibilities: Provider tree (ThemeProvider, QueryClientProvider, ClerkProvider), auth guards, `TokenInitializer`

**Web Router:**
- Location: `apps/web/src/router.tsx`
- Responsibilities: Creates TanStack Router from generated `routeTree.gen.ts`

**API Server:**
- Location: `apps/api/src/index.ts`
- Triggers: `@hono/node-server` `serve()` on `PORT` (default 8080)
- Responsibilities: Middleware chain registration, route mounting, centralized error handling

## Architectural Constraints

- **DB access boundary:** `packages/db` is imported by `apps/api` only. `apps/web` never imports from `@ploutizo/db` — all data flows through the HTTP API.
- **Form state:** `useState` is never used for form field values. All forms use `useAppForm` from `@ploutizo/ui/components/form`.
- **Raw fetch:** Raw `fetch()` calls in `apps/web` components are prohibited. All API calls go through `apiFetch`.
- **Middleware order (invariant):** CORS → Clerk JWT → `tenantGuard`. Changing this order breaks auth or CORS preflight handling.
- **Webhook route:** `/webhooks/*` is excluded from `tenantGuard` — Clerk webhook requests have no JWT.
- **Threading:** Single-threaded Node.js event loop in `apps/api`; `seenOrgs` Set in `tenantGuard` is process-lifetime state that resets on cold start.
- **Global state:** `tokenGetter` in `apps/web/src/lib/queryClient.ts` is module-level mutable state (set once at app init via `setTokenGetter`). `seenOrgs` in `tenantGuard.ts` is module-level mutable state (safe — DB row persists across resets).
- **Circular imports:** Drizzle self-referential FK in `transactions` schema uses lazy arrow `(): AnyPgColumn =>` to break circular type reference (`packages/db/src/schema/transactions.ts:58`).

## Anti-Patterns

### Calling query functions directly from route handlers

**What happens:** Route handler imports from `apps/api/src/lib/queries/` and calls query functions directly, bypassing the service layer.
**Why it's wrong:** Business logic (ownership checks, domain validation, split sum validation) lives in services. Bypassing services skips these rules silently.
**Do this instead:** Route handlers call service functions in `apps/api/src/services/*.ts`; services call query functions.

### Using `useState` for form field values

**What happens:** A component uses `useState` to manage input values instead of `useAppForm`.
**Why it's wrong:** Violates project constraint; duplicates form state management; loses TanStack Form validation, dirty-state tracking, and submission handling.
**Do this instead:** Use `useAppForm` from `@ploutizo/ui/components/form` with Zod `validators`.

### Adding raw `fetch()` calls in web components

**What happens:** A component calls `fetch('/api/...')` directly without going through `apiFetch`.
**Why it's wrong:** Skips Clerk JWT attachment; skips typed error handling; bypasses `VITE_API_URL` configuration.
**Do this instead:** Add a query function in `apps/web/src/lib/data-access/<resource>/queries.ts` using `apiFetch`, then wrap in a TanStack Query hook.

### Importing `@ploutizo/db` from `apps/web`

**What happens:** A file in `apps/web` imports the Drizzle client or schema from `@ploutizo/db`.
**Why it's wrong:** Exposes the database connection string to the browser bundle; violates the API boundary that enforces auth and tenancy.
**Do this instead:** Add an API endpoint in `apps/api` and fetch it via `apiFetch` in the web app.

## Error Handling

**Strategy:** Services throw `DomainError`/`NotFoundError`; Hono's `app.onError` handler maps them to JSON responses. Routes handle only input validation errors inline.

**Patterns:**
- Services: `throw new DomainError(statusCode, message, code?)` or `throw new NotFoundError(message)` (`apps/api/src/lib/errors.ts`)
- Routes: inline `c.json({ error: { code, message } }, statusCode)` only for validation checks before service calls
- `app.onError`: maps `NotFoundError` → 404, `DomainError` → its `statusCode`, `Error` → 500 (`apps/api/src/index.ts:86`)
- Web: `apiFetch` throws the parsed JSON error object on non-OK responses; TanStack Query surfaces it via `error` state

## Cross-Cutting Concerns

**Logging:** `console.error` in `app.onError` for unhandled errors (`apps/api/src/index.ts:96`). No structured logging framework.
**Validation:** `appValidator` middleware using `@hono/zod-validator` + `@ploutizo/validators` schemas in API. `useAppForm` + Zod in web forms.
**Authentication:** Clerk JWT verified by `clerkMiddleware` on every request; `tenantGuard` enforces active org on `/api/*`.

---

*Architecture analysis: 2026-05-11*
