# Phase 1: Foundation & Auth Infrastructure - Research

**Researched:** 2026-03-29
**Domain:** Monorepo setup, Clerk auth with satellite domains, Hono API with tenant guard, Drizzle + postgres.js, Railway deployment
**Confidence:** HIGH (core stack decisions locked; all critical APIs verified against official sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Rename all packages to `@ploutizo/*`. `@workspace/ui` → `@ploutizo/ui`. New packages: `@ploutizo/db`, `@ploutizo/validators`, `@ploutizo/types`.
- **D-02:** Update `pnpm-workspace.yaml`, all `package.json` files, and import paths in `apps/web`. CLAUDE.md stays as-is.
- **D-03:** Use the production Clerk instance from day 1. No dev instance. Local `.env` files use production keys.
- **D-04:** Local `.env` files use production Clerk API keys. Satellite domain config, `authorizedParties`, and `clockSkewInMs: 10000` all target the production instance.
- **D-05:** Phase 1 ends with a live Railway deployment and smoke test. Verification: `pnpm build` passes in Railway CI, `db:migrate` runs as pre-deploy command, health endpoint (`GET /health`) returns 200, `DATABASE_URL` and `CLERK_SECRET_KEY` scoped to individual services.
- **D-06:** `VITE_DATABASE_URL` and `VITE_CLERK_SECRET_KEY` must not appear in the browser bundle — verified post-deploy.
- **D-07:** Audit and fix all existing shadcn components in `packages/ui` during Phase 1. Patch: explicit border colors (`border-border` or specific color tokens, not bare `border`), explicit ring colors, shadow and rounded scale names verified/updated for v4.

### Claude's Discretion

- Exact Railway service names and project structure on Railway dashboard
- Connection pool size for `postgres.js` (start with default; tune later)
- Health endpoint response body (minimal `{ status: "ok" }` is fine)
- `.env.example` file contents and structure

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 1 establishes the complete infrastructure substrate before any feature code is written. The codebase has a working monorepo scaffold (`apps/web`, `packages/ui`) but lacks `apps/api` entirely and three packages (`@ploutizo/db`, `@ploutizo/validators`, `@ploutizo/types`). All existing packages use the `@workspace/*` namespace that must be renamed to `@ploutizo/*`.

The most complex work involves Clerk satellite domains — required because `ploutizo.app` is the primary domain and each household gets a `{slug}.ploutizo.app` subdomain. Satellite domain config must live in `apps/web`'s `src/start.ts` middleware using `@clerk/tanstack-react-start`. The API side uses `@hono/clerk-auth` with `getAuth(c)` returning `{ userId, orgId, orgRole }` from the verified JWT. `orgId` is `undefined` (not `null`) when no active org is set — the `tenantGuard()` must use `!orgId`.

The database client must be `postgres.js` initialized at module scope in `packages/db` — not `neon-http` (no transaction support) and not `neon-serverless` (unnecessary for a persistent Railway Node.js server). Migrations run via `drizzle-kit migrate` as a Railway pre-deploy command using the direct (non-pooler) Neon URL.

**Primary recommendation:** Create `apps/api` as a Hono Node.js app and three new packages (`@ploutizo/db`, `@ploutizo/validators`, `@ploutizo/types`) in a single structured wave. Rename all packages in parallel. Wire Clerk, tenant guard, migrations, and seed scripts before declaring Phase 1 done.

---

## Project Constraints (from CLAUDE.md)

| Constraint | Detail |
|------------|--------|
| Package boundaries | `@ploutizo/ui` → web only; `@ploutizo/db` → api only; `@ploutizo/validators` + `@ploutizo/types` → both |
| `orgId` source | ALWAYS from Clerk JWT context via middleware — never from request body, params, or query string |
| Middleware order | `cors()` → `clerkMiddleware()` → `tenantGuard()` — exact order is invariant |
| DB queries | Every query on tenant-scoped tables MUST include `.where(eq(table.orgId, orgId))` |
| Arrow functions | All functions use arrow syntax — no `function` keyword in custom code |
| Named exports | No default exports on custom components or utilities |
| TypeScript strict | `strict: true` in all tsconfigs — no `any` without `// reason:` comment |
| Zod schemas | Defined in `@ploutizo/validators` — never inline in handlers or components |
| Seed data | Never nullable `org_id` rows — use seed scripts in `packages/db/seeds/` |
| UI library order | ReUI first, then shadcn — never raw HTML for covered patterns |
| Styling | Tailwind utility classes only — no inline styles, no CSS modules |
| Testing | Vitest + Testing Library; every new function/component ships with tests; co-located test files |
| No mocking pure functions | Test pure functions directly with inputs/outputs |
| Branch naming | `feature/<kebab-description>` format |

---

## Existing Codebase State

### What Already Exists

| Item | Current State | Phase 1 Action |
|------|--------------|----------------|
| `apps/web` | TanStack Start with TanStack Router, Vite, Tailwind v4 | Add Clerk; rename `@workspace/ui` → `@ploutizo/ui` imports |
| `packages/ui` | shadcn scaffold, `button.tsx` + `globals.css`, name `@workspace/ui` | Rename to `@ploutizo/ui`; audit Tailwind v4 classes |
| `turbo.json` | build/lint/typecheck/dev tasks configured | Add `test` and `db:migrate` tasks |
| `pnpm-workspace.yaml` | `apps/*` + `packages/*` globs | No changes needed — globs auto-include new packages |
| Root `tsconfig.json` | `strict: true`, ES2022, bundler resolution | No changes needed |
| `apps/web/tsconfig.json` | `strict: true`, paths include `@workspace/ui` | Update paths to `@ploutizo/ui` |
| `packages/ui/tsconfig.json` | `strict: true`, paths include `@workspace/ui` | Update paths to `@ploutizo/ui` |

### What Does NOT Exist (Must Be Created)

- `apps/api/` — Hono Node.js app
- `packages/db/` — Drizzle + postgres.js client
- `packages/validators/` — Zod schemas
- `packages/types/` — Shared TypeScript interfaces + enums
- `drizzle.config.ts` (root level) — migration config
- Any `.env` files
- Any test infrastructure (vitest.config.ts, test files)
- Any seed scripts

### Tailwind v4 Audit Pre-findings

The existing `globals.css` uses `@theme inline` with all CSS vars mapped as `--color-*` tokens. The single existing component (`button.tsx`) uses explicit design tokens throughout (`border-border`, `ring-ring`, `ring-3`) — already v4 compliant. The `@layer base` block applies `border-border` globally via `* { @apply border-border ... }`. This is the correct v4 pattern.

**Audit scope:** Only `button.tsx` exists. It is compliant. Phase 1 audit will document this and establish the rule for new components going forward.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `hono` | 4.12.9 | API framework | Lightweight, TypeScript-first, runs on Node.js and edge |
| `@hono/node-server` | 1.19.11 | Node.js HTTP server adapter | Required to serve Hono on Node.js |
| `@hono/clerk-auth` | 3.1.0 | Clerk auth middleware for Hono | Official Hono-Clerk integration |
| `postgres` | 3.4.8 | PostgreSQL client (postgres.js) | Required by D-03; supports transactions, module-scope init |
| `drizzle-orm` | 0.45.2 | TypeScript ORM | Project decision; integrates with postgres.js |
| `drizzle-kit` | 0.31.10 | Migration CLI | Required for `db:generate` and `db:migrate` commands |
| `@clerk/tanstack-react-start` | 0.11.5 | Clerk for TanStack Start frontend | Official SDK for TanStack Start |
| `neverthrow` | 8.2.0 | Result type for error handling | Project decision per CLAUDE.md |
| `zod` | 4.3.6 | Schema validation | Project decision; schemas live in `@ploutizo/validators` |
| `vitest` | 4.1.2 | Test runner | Project decision per CLAUDE.md |
| `@testing-library/react` | Latest | Component testing | Project decision per CLAUDE.md |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | 5.95.2 | Server state management | All API calls in `apps/web` |
| `svix` | 1.89.0 | Webhook signature verification | Clerk webhook handler (org.created) |
| `hono/cors` | built-in | CORS middleware | Applied globally before Clerk middleware |
| `lucide-react` | ^1.7.0 | Icons | Already in `packages/ui` |

**Installation for `apps/api`:**
```bash
pnpm add hono @hono/node-server @hono/clerk-auth neverthrow --filter apps/api
pnpm add -D vitest @types/node typescript --filter apps/api
```

**Installation for `packages/db`:**
```bash
pnpm add drizzle-orm postgres --filter @ploutizo/db
pnpm add -D drizzle-kit @types/node typescript --filter @ploutizo/db
```

**Installation for `packages/validators`:**
```bash
pnpm add zod --filter @ploutizo/validators
pnpm add -D typescript --filter @ploutizo/validators
```

**Installation for `packages/types`:**
```bash
pnpm add -D typescript --filter @ploutizo/types
```

**Adding Clerk to `apps/web`:**
```bash
pnpm add @clerk/tanstack-react-start @tanstack/react-query --filter web
```

**Version verification (confirmed 2026-03-29 via pnpm registry):** All versions above verified against npm registry on research date.

---

## Architecture Patterns

### Recommended Project Structure

```
ploutizo/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── start.ts              # clerkMiddleware() — Clerk satellite config
│   │       ├── routes/
│   │       │   └── __root.tsx        # ClerkProvider wraps app
│   │       └── lib/
│   │           └── queryClient.ts    # React Query client with Clerk token injection
│   └── api/
│       └── src/
│           ├── index.ts              # Hono app, serve(), port 8080
│           ├── middleware/
│           │   └── tenantGuard.ts    # tenantGuard() — checks !orgId
│           └── routes/
│               ├── health.ts         # GET /health → { status: "ok" }
│               └── webhooks.ts       # POST /webhooks/clerk (org.created)
├── packages/
│   ├── ui/          # Renamed @ploutizo/ui — existing components
│   ├── db/
│   │   ├── src/
│   │   │   ├── client.ts             # postgres.js + drizzle init at module scope
│   │   │   ├── schema/
│   │   │   │   └── enums.ts          # pgEnum stubs (full schema in Phase 2+)
│   │   │   ├── seeds/
│   │   │   │   ├── categories.ts     # seedOrgCategories(orgId)
│   │   │   │   ├── merchantRules.ts  # seedOrgMerchantRules(orgId)
│   │   │   │   └── index.ts          # seedOrg(orgId) wrapper
│   │   │   └── index.ts              # barrel export
│   │   └── package.json              # name: "@ploutizo/db"
│   ├── validators/
│   │   ├── src/
│   │   │   └── index.ts              # barrel — empty in Phase 1
│   │   └── package.json              # name: "@ploutizo/validators"
│   └── types/
│       ├── src/
│       │   └── index.ts              # barrel — empty in Phase 1
│       └── package.json              # name: "@ploutizo/types"
├── drizzle.config.ts                 # Migration config — points to packages/db/src/schema
└── .env.example
```

### Pattern 1: postgres.js Module-Scope Initialization

**What:** Initialize the `postgres.js` client once at module load, not per-request.
**When to use:** Always — for a persistent Node.js server this is correct. Do NOT initialize inside request handlers.

```typescript
// packages/db/src/client.ts
// Source: https://orm.drizzle.team/docs/connect-neon (verified 2026-03-29)
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

const client = postgres(process.env.DATABASE_URL!, {
  max: 10, // default pool size; tune later (D-discretion)
})

export const db = drizzle({ client, schema })
```

**Why postgres.js and not neon-http:**
- `neon-http` does not support multi-statement transactions — any feature requiring rollback will fail silently
- Railway runs a persistent Node.js process, not a serverless lambda — the `neon-serverless` WebSocket driver is unnecessary overhead
- `postgres.js` is the standard Node.js PostgreSQL client and supports all PostgreSQL features

**Neon direct URL vs pooler:** Always use the direct (non-pooler) Neon URL for:
1. The `postgres.js` client in `apps/api` — postgres.js manages its own connection pool
2. `drizzle-kit migrate` — the Neon docs explicitly state "using a pooled connection string for migrations can lead to errors"

### Pattern 2: Hono App with Correct Middleware Order

**What:** Global middleware applied in the invariant order from CLAUDE.md.
**When to use:** All middleware is applied globally at the app level.

```typescript
// apps/api/src/index.ts
// Source: https://hono.dev/docs/getting-started/nodejs (verified 2026-03-29)
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { clerkMiddleware } from '@hono/clerk-auth'
import { tenantGuard } from './middleware/tenantGuard.js'

const app = new Hono()

// Invariant middleware order: CORS → Clerk → tenant guard
app.use('*', cors({
  origin: (origin) =>
    origin === 'https://ploutizo.app' || origin.endsWith('.ploutizo.app') || origin === 'http://localhost:3000'
      ? origin
      : 'https://ploutizo.app',
  credentials: true,
}))

app.use('*', clerkMiddleware({
  clockSkewInMs: 10000,          // D-04: Railway container clock drift
  authorizedParties: [
    'https://ploutizo.app',
    'https://*.ploutizo.app',    // satellite subdomains
    'http://localhost:3000',
  ],
}))

app.use('/api/*', tenantGuard()) // Applied to all API routes (not /health, not /webhooks)

serve({ fetch: app.fetch, port: 8080 })
```

**Note on `authorizedParties` wildcard:** Clerk may not support glob patterns in `authorizedParties`. At research time, the exact wildcard support for subdomain matching was not confirmed from official docs. The planner should flag this as needing verification during implementation — if wildcards are not supported, enumerate known origins or use a dynamic check.

### Pattern 3: tenantGuard() Middleware

**What:** Rejects requests where no active Clerk org is present.
**When to use:** Applied on all `/api/*` routes. NOT applied to `/health` or `/webhooks/clerk`.

```typescript
// apps/api/src/middleware/tenantGuard.ts
// Source: CLAUDE.md invariant + .planning/REQUIREMENTS.md (orgId is undefined, not null)
import { createMiddleware } from 'hono/factory'
import { getAuth } from '@hono/clerk-auth'

export const tenantGuard = () =>
  createMiddleware(async (c, next) => {
    const { orgId } = getAuth(c)
    if (!orgId) {
      return c.json(
        { error: { code: 'TENANT_REQUIRED', message: 'No active organisation.' } },
        401
      )
    }
    await next()
  })
```

**Critical:** `getAuth(c).orgId` returns `undefined` (structurally absent) when no active org is set — NOT `null`. Using `orgId === null` would silently pass unauthenticated requests through. The check MUST be `!orgId` (falsy).

### Pattern 4: Standard Response Shape

```typescript
// All success responses
return c.json({ data: result })

// All error responses
return c.json({ error: { code: 'ERROR_CODE', message: 'Human message.', details?: unknown } }, statusCode)
```

### Pattern 5: Clerk satellite domain config in TanStack Start

**What:** `src/start.ts` wires `clerkMiddleware()` with satellite configuration.
**When to use:** Each household subdomain is a satellite — `isSatellite` and `domain` are set from env vars.

```typescript
// apps/web/src/start.ts
// Source: https://clerk.com/docs/references/tanstack-react-start/clerk-middleware (verified 2026-03-29)
import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => ({
  requestMiddleware: [
    clerkMiddleware({
      // isSatellite and domain are set via env vars VITE_CLERK_IS_SATELLITE, VITE_CLERK_DOMAIN
      // See environment variable section below
    }),
  ],
}))
```

**Satellite env vars (for subdomain deployments):**
```bash
# Primary domain (ploutizo.app)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Satellite domain ({slug}.ploutizo.app) — set per-subdomain
VITE_CLERK_IS_SATELLITE=true
VITE_CLERK_DOMAIN={slug}.ploutizo.app
VITE_CLERK_SIGN_IN_URL=https://ploutizo.app/sign-in
VITE_CLERK_SIGN_UP_URL=https://ploutizo.app/sign-up
```

**ClerkProvider in `__root.tsx`:**
```tsx
// apps/web/src/routes/__root.tsx
import { ClerkProvider } from '@clerk/tanstack-react-start'

// Wrap shell component children in ClerkProvider
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <ClerkProvider>{children}</ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
```

### Pattern 6: Clerk Webhook Handler (org.created)

**What:** Receives Clerk's `organization.created` webhook event and calls `seedOrg(orgId)`.

```typescript
// apps/api/src/routes/webhooks.ts
// Source: Clerk webhook docs (verified 2026-03-29)
import { Hono } from 'hono'
import { Webhook } from 'svix'
import { seedOrg } from '@ploutizo/db/seeds'

const webhooksRouter = new Hono()

webhooksRouter.post('/clerk', async (c) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) return c.json({ error: 'Missing webhook secret' }, 500)

  const svix = new Webhook(webhookSecret)
  const payload = await c.req.text()
  const headers = {
    'svix-id': c.req.header('svix-id') ?? '',
    'svix-timestamp': c.req.header('svix-timestamp') ?? '',
    'svix-signature': c.req.header('svix-signature') ?? '',
  }

  let event: { type: string; data: { id: string } }
  try {
    event = svix.verify(payload, headers) as typeof event
  } catch {
    return c.json({ error: 'Invalid signature' }, 400)
  }

  if (event.type === 'organization.created') {
    await seedOrg(event.data.id)
  }

  return c.json({ data: { received: true } })
})

export { webhooksRouter }
```

**Note:** The `tenantGuard()` must NOT be applied to `/webhooks/clerk` — Clerk webhooks do not carry a user JWT.

### Pattern 7: drizzle.config.ts

```typescript
// drizzle.config.ts (root)
// Source: https://orm.drizzle.team/docs/drizzle-config-file (verified 2026-03-29)
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './packages/db/src/schema/index.ts',
  out: './packages/db/drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

**Railway pre-deploy command:** `pnpm db:migrate`

Root `package.json` scripts:
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push"
  }
}
```

### Pattern 8: Seed Scripts Structure

```typescript
// packages/db/src/seeds/index.ts
import { seedOrgCategories } from './categories.js'
import { seedOrgMerchantRules } from './merchantRules.js'

export const seedOrg = async (orgId: string): Promise<void> => {
  await seedOrgCategories(orgId)
  await seedOrgMerchantRules(orgId)
}

export { seedOrgCategories, seedOrgMerchantRules }
```

```typescript
// packages/db/src/seeds/categories.ts
import { db } from '../client.js'
import { categories } from '../schema/index.js'

export const seedOrgCategories = async (orgId: string): Promise<void> => {
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((cat) => ({ ...cat, orgId }))
  )
}
```

**Invariant:** All seeded rows have non-nullable `orgId`. No global seed rows. `org_id` must never be nullable on any tenant-scoped table.

### Anti-Patterns to Avoid

- **PgBouncer pooler URL for migrations:** Drizzle migrations must use the direct Neon URL — pooler breaks prepared statements and causes migration errors
- **`orgId === null` in tenantGuard:** Clerk returns `undefined` for missing orgId — strict null check silently passes unauthenticated requests
- **`tenantGuard` on /health or /webhooks:** Health checks and Clerk webhooks have no JWT — applying tenant guard breaks them
- **`@ploutizo/db` imported in `apps/web`:** Hard boundary enforced by pnpm workspace declarations
- **`@ploutizo/ui` imported in `apps/api`:** Hard boundary enforced by pnpm workspace declarations
- **`DATABASE_URL` as a VITE_ variable:** This would embed the database URL in the browser bundle (D-06 violation)
- **Clerk dev instance for local dev:** Cannot migrate user/org data from dev to prod — use production instance from day 1 (D-03)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clerk JWT verification | Custom JWT parsing | `@hono/clerk-auth` `clerkMiddleware()` | RS256 key rotation, clock skew, audience validation — all handled |
| Webhook signature verification | Custom HMAC check | `svix` `Webhook.verify()` | Timing attacks, replay protection handled by Svix |
| DB migrations | Custom migration scripts | `drizzle-kit migrate` | Migration tracking, ordering, rollback safety |
| Connection pooling | Manual pool management | `postgres.js` built-in pool | Connection lifecycle, idle timeout, max connections all handled |
| TypeScript error-as-value | Try/catch everywhere | `neverthrow` `Result<T, E>` | Type-safe error propagation without exceptions |

**Key insight:** Clerk's multi-tenancy surface (JWT claims, org switching, satellite domains) has enough edge cases that hand-rolling any piece creates a security vulnerability surface. Use the official SDK.

---

## Common Pitfalls

### Pitfall 1: `orgId` Is `undefined`, Not `null`

**What goes wrong:** `tenantGuard` checks `orgId === null`, passes when user has no active org (undefined), allows unauthenticated multi-tenant access.
**Why it happens:** TypeScript/JavaScript distinction between `null` and `undefined`; developers assume `null` for "missing."
**How to avoid:** Always check `!orgId` (falsy). This handles both `null` and `undefined`.
**Warning signs:** API calls succeed without an active org selected in the frontend.

### Pitfall 2: PgBouncer Pooler URL Breaks Migrations

**What goes wrong:** `drizzle-kit migrate` fails with prepared statement errors or connection reset.
**Why it happens:** Neon's PgBouncer pooler uses transaction-mode pooling that breaks named prepared statements used by `drizzle-kit`.
**How to avoid:** Always use the direct Neon connection URL for migrations. The format is `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname` (NOT the `-pooler` variant).
**Warning signs:** Errors mentioning "prepared statement", "portal does not exist", or "connection reset."

### Pitfall 3: Clerk Production Instance From Day 1

**What goes wrong:** Development begins with a Clerk dev instance, then at launch a "quick switch" is attempted to production — but Clerk user/org data cannot be migrated between instances. All existing users and orgs are lost.
**Why it happens:** Assumption that dev→prod is just an env var swap.
**How to avoid:** D-03 is locked: use production Clerk keys from day 1, including local `.env`.
**Warning signs:** Having separate `CLERK_PUBLISHABLE_KEY_DEV` and `CLERK_PUBLISHABLE_KEY_PROD` variables.

### Pitfall 4: `tenantGuard` Applied to Webhook Routes

**What goes wrong:** POST `/webhooks/clerk` is rejected with 401 because it has no Clerk JWT.
**Why it happens:** Applying `app.use('*', tenantGuard())` catches all routes including webhooks.
**How to avoid:** Scope tenant guard to `/api/*` only. `/health` and `/webhooks/*` must be excluded.
**Warning signs:** Clerk dashboard shows webhook delivery failures with 401 status.

### Pitfall 5: Neon Connection Limits

**What goes wrong:** Under load, the app exhausts the Neon connection limit for the plan tier, causing `postgres.js` connection queue to fill and requests to timeout.
**Why it happens:** `postgres.js` default pool max is 10; Railway may run multiple instances.
**How to avoid:** Verify Neon plan connection limit before production launch (open item in STATE.md). Start with `max: 10` (discretion item). Use Neon's connection pooler URL for `apps/api` in production if connection count becomes an issue (distinct from migration URL — pooler is safe for application queries).
**Warning signs:** "too many connections" PostgreSQL errors in production logs.

### Pitfall 6: `VITE_` Prefix Leaks Secrets to Browser

**What goes wrong:** Using `VITE_DATABASE_URL` or `VITE_CLERK_SECRET_KEY` embeds these values in the client JavaScript bundle.
**Why it happens:** Vite exposes all `VITE_*`-prefixed env vars to the browser at build time.
**How to avoid:** `DATABASE_URL` and `CLERK_SECRET_KEY` must never use the `VITE_` prefix. Only `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_URL` are safe as browser-visible vars. Verify post-deploy with bundle search (D-06).
**Warning signs:** Running `grep -r "sk_live_" dist/` returns results.

### Pitfall 7: Tailwind v4 Breaking Changes in Components

**What goes wrong:** Components that use bare `border` (no color token) show no visible border (since v4 defaults `border` to `currentColor`). Components using bare `ring` without explicit ring color get unexpected sizing.
**Why it happens:** Tailwind v4 changed `border` default from `gray-200` to `currentColor`, and `ring` from 3px blue to 1px with no default color.
**How to avoid:** D-07 mandates an audit and fix of all components in `packages/ui`. Pattern: `border-border` (not `border`), `ring-ring` (not `ring`). The existing `button.tsx` and `globals.css` already use this pattern correctly — new components must follow the same convention.
**Warning signs:** Invisible borders on form inputs, tables, or cards in the browser.

---

## Code Examples

### Complete `apps/api` Entry Point

```typescript
// apps/api/src/index.ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { clerkMiddleware } from '@hono/clerk-auth'
import { tenantGuard } from './middleware/tenantGuard.js'
import { healthRouter } from './routes/health.js'
import { webhooksRouter } from './routes/webhooks.js'

const app = new Hono()

// 1. CORS — before Clerk so preflight requests are handled
app.use('*', cors({
  origin: (origin) =>
    origin === 'https://ploutizo.app' ||
    origin.endsWith('.ploutizo.app') ||
    origin === 'http://localhost:3000'
      ? origin
      : 'https://ploutizo.app',
  credentials: true,
}))

// 2. Clerk JWT verification
app.use('*', clerkMiddleware({
  clockSkewInMs: 10000,
  authorizedParties: ['https://ploutizo.app', 'http://localhost:3000'],
}))

// 3. Tenant guard — scoped to /api/* only
app.use('/api/*', tenantGuard())

// Routes excluded from tenant guard
app.route('/health', healthRouter)
app.route('/webhooks', webhooksRouter)

// Protected routes (added in future phases)
// app.route('/api/accounts', accountsRouter)

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8080) })
```

### Health Endpoint

```typescript
// apps/api/src/routes/health.ts
import { Hono } from 'hono'

const healthRouter = new Hono()

healthRouter.get('/', (c) => c.json({ data: { status: 'ok' } }))

export { healthRouter }
```

### Package Rename Checklist (files to update)

Files requiring `@workspace/` → `@ploutizo/` substitution:

1. `packages/ui/package.json` — `"name": "@ploutizo/ui"`
2. `packages/ui/tsconfig.json` — path alias `"@ploutizo/ui/*": ["./src/*"]`
3. `apps/web/package.json` — dependency `"@ploutizo/ui": "workspace:*"`
4. `apps/web/tsconfig.json` — path `"@ploutizo/ui/*": ["../../packages/ui/src/*"]`
5. `apps/web/src/routes/__root.tsx` — import `@ploutizo/ui/globals.css`
6. `apps/web/src/routes/index.tsx` — import `@ploutizo/ui/components/button`

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All apps | Yes | v22.14.0 | — |
| pnpm | Package management | Yes | 9.15.9 | — |
| Neon database (prod) | `packages/db` migrations | Requires account setup | — | None — required |
| Clerk account (prod) | Auth throughout | Requires account setup | — | None — D-03 mandates prod instance |
| Railway account | Deployment (D-05) | Requires account setup | — | None — Phase 1 ends with live deploy |
| Cloudflare account | `clerk.ploutizo.app` DNS | Requires domain config | — | None — needed for satellite auth |
| `drizzle-kit` CLI | Migrations | Will be installed | — | — |

**Missing dependencies with no fallback:**
- Neon production database — must be provisioned before Phase 1 can run migrations
- Clerk production account — must be created before auth can be configured (D-03)
- Railway project — must be created before Phase 1 deployment smoke test (D-05)
- Cloudflare DNS config for `clerk.ploutizo.app` — must be "DNS only" (grey cloud) per ROADMAP open item

**Deployment note:** The Cloudflare CNAME for `clerk.ploutizo.app` must be "DNS only" (grey cloud), not proxied. If Cloudflare proxies this, Clerk's FAPI calls will fail because Cloudflare intercepts the SSL/TLS handshake.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` — does NOT exist yet (Wave 0 gap) |
| Quick run command | `pnpm test --filter @ploutizo/db` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `tenantGuard()` rejects request when `orgId` is `undefined` | unit | `pnpm test --filter apps/api` | No — Wave 0 |
| `tenantGuard()` rejects request when `orgId` is `null` | unit | `pnpm test --filter apps/api` | No — Wave 0 |
| `tenantGuard()` passes request when `orgId` is a valid string | unit | `pnpm test --filter apps/api` | No — Wave 0 |
| `seedOrgCategories()` inserts rows with non-nullable `orgId` | unit | `pnpm test --filter @ploutizo/db` | No — Wave 0 |
| `seedOrgMerchantRules()` inserts rows with non-nullable `orgId` | unit | `pnpm test --filter @ploutizo/db` | No — Wave 0 |
| `seedOrg()` calls both seed functions | unit | `pnpm test --filter @ploutizo/db` | No — Wave 0 |
| `db` client executes a multi-step transaction without error | integration | Manual / smoke test | No — Wave 0 |
| Build succeeds across all packages | build | `pnpm build` | No — CI |
| `VITE_DATABASE_URL` absent from browser bundle | smoke | `grep -r "DATABASE_URL" apps/web/dist/` | No — post-deploy |

### Sampling Rate
- **Per task commit:** `pnpm test --filter <changed-package>`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green + Railway smoke test before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` at workspace root — covers all packages
- [ ] `apps/api/src/middleware/tenantGuard.test.ts` — covers tenant guard unit tests
- [ ] `packages/db/src/seeds/index.test.ts` — covers seed function unit tests
- [ ] Shared test setup (mocking `@ploutizo/db` in API tests)
- [ ] Framework install: `pnpm add -D vitest @testing-library/react @types/node -w` (workspace root)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `neon-http` for Drizzle + Neon | `postgres.js` for persistent Node.js | Neon recommendation for non-serverless | Transaction support, no HTTP overhead |
| Tailwind v3 `border` = `gray-200` | Tailwind v4 `border` = `currentColor` | Tailwind v4 (in use) | Must specify `border-border` explicitly |
| Tailwind v3 `ring` = `3px blue` | Tailwind v4 `ring` = `1px, no default color` | Tailwind v4 (in use) | Must specify `ring-ring` explicitly |
| Clerk dev instance → prod cutover | Production instance from day 1 | Always a risk; D-03 locks this | No data loss on launch |
| `!important` prefix: `!flex` | `!important` postfix: `flex!` | Tailwind v4 | Audit existing classes |

**Deprecated/outdated:**
- `neon-http` driver: correct for serverless edge functions, wrong for persistent Node.js on Railway — DO NOT use
- Bare `border` class in Tailwind v4 components: no longer produces `gray-200` border — always specify color
- `orgId === null` check: Clerk returns `undefined` — this check always passes, silently breaking tenant isolation

---

## Open Questions

1. **`authorizedParties` wildcard support for subdomain matching**
   - What we know: The option accepts an array of origin strings; the ClerkMiddleware docs show specific origins
   - What's unclear: Whether `https://*.ploutizo.app` wildcard syntax is supported, or if origins must be enumerated
   - Recommendation: During implementation, test with a known subdomain first. If wildcards fail, use a dynamic function or enumerate known origins. This is LOW risk since satellite domain validation is a defense-in-depth measure.

2. **TanStack Start `src/start.ts` exact file name and export**
   - What we know: Clerk docs for TanStack React Start specify `src/start.ts` and `createStart()`
   - What's unclear: The current `apps/web` setup uses `vite.config.ts` with `tanstackStart()` plugin — whether `src/start.ts` is the correct integration point for this project's TanStack version (1.132.0 vs latest 1.167.13) needs verification during implementation
   - Recommendation: Check TanStack Start changelog for `createStart()` API before implementing; the planner should mark this as needing a quick verification step in the Clerk plan.

3. **Neon connection limit on chosen plan**
   - What we know: `postgres.js` default pool `max` is 10; Neon free tier allows 100 connections
   - What's unclear: Exact current Neon plan tier and limits for this project
   - Recommendation: Start with `max: 10`; verify plan limits at Neon dashboard before production launch (open item in STATE.md)

---

## Sources

### Primary (HIGH confidence)
- Official Drizzle ORM docs (orm.drizzle.team) — `postgres.js` connection pattern, `drizzle.config.ts` format, migrations workflow
- Official Clerk docs (clerk.com) — `clockSkewInMs` and `authorizedParties` options, satellite domain configuration, webhook verification with `svix`
- Official Hono docs (hono.dev) — Node.js setup, CORS configuration, middleware pattern
- Clerk TanStack React Start middleware docs — `src/start.ts`, `clerkMiddleware()` configuration options
- npm registry (via pnpm view) — all package versions verified 2026-03-29

### Secondary (MEDIUM confidence)
- Neon docs — recommendation to use direct URL (not pooler) for migrations
- `@hono/clerk-auth` GitHub README — basic usage pattern for `clerkMiddleware()` and `getAuth(c)`

### Tertiary (LOW confidence)
- `authorizedParties` wildcard subdomain support — not confirmed from official Clerk docs; needs runtime verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against npm registry on research date
- Architecture patterns: HIGH — based on official docs for Hono, Clerk, Drizzle, with cross-verification
- `tenantGuard` behavior: HIGH — `!orgId` falsy check is documented in `.planning/REQUIREMENTS.md` as research-derived invariant
- Pitfalls: HIGH — cross-verified with Neon and Tailwind v4 official docs
- `authorizedParties` wildcard: LOW — needs runtime verification during implementation
- TanStack Start `createStart()` API compatibility: MEDIUM — docs available but version delta between scaffold (1.132) and latest (1.167) introduces risk

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (Clerk and TanStack are fast-moving; re-verify if planning delays > 30 days)
