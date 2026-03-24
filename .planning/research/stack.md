# Stack Research

**Project:** ploutizo — personal finance tracker for Canadian households
**Researched:** 2026-03-24
**Stack:** TanStack Start + Hono + Drizzle + Neon + Clerk + pnpm Turborepo + React Query + shadcn/ui + Tailwind CSS v4 + Railway

---

## 1. TanStack Start: Current Status & Railway Deployment

### Version Status

TanStack Start is in **Release Candidate (RC)** status as of early 2025, approaching v1.0. The team considers it feature-complete and production-usable with locked dependency versions. The project scaffolded via `shadcn@latest init --preset b5cRMQsEM` already incorporates a current RC version.

**Confidence:** MEDIUM (official TanStack website, early 2025)

### Railway Deployment

TanStack Start is built on Vinxi and outputs a Node.js server. It deploys to Railway as a standard Node.js service:

- The build output is a Node.js HTTP server (not edge/serverless). No special adapter is needed for Railway — the Node.js adapter is the default when building for traditional servers.
- Railway detects the `start` command from `package.json`. The TanStack Start production start command is typically `node .output/server/index.mjs` after `pnpm build`.
- Railway injects `PORT` as an environment variable. TanStack Start/Vinxi respects the `PORT` env var automatically for its server listener.
- No Dockerfile is required for Railway — Nixpacks can detect and build a Node.js pnpm workspace. However, for a Turborepo monorepo, you need to specify the root as the build context and ensure Railway knows the start command for `apps/web` specifically.

**Monorepo consideration on Railway:** Railway treats each service independently. For `apps/web` and `apps/api` as separate Railway services within one project, set the Root Directory to the repo root and override the build/start commands per service:
- `apps/web` build: `pnpm build --filter=web`
- `apps/web` start: `node apps/web/.output/server/index.mjs`
- `apps/api` build: `pnpm build --filter=api`
- `apps/api` start: `node apps/api/dist/index.js`

**Confidence:** MEDIUM (Hono Node.js docs + Railway general Node.js patterns — no TanStack Start-specific Railway docs found)

### SSR Edge Cases

TanStack Start's SSR works by rendering routes on the server and streaming HTML to the client. Key SSR considerations:

- **Router context is the SSR boundary.** Data fetched in `loader` functions on the server is serialized and passed to the client. React Query's dehydration/hydration pattern plugs into this boundary — see section 6.
- **`document.` and `window.` access must be guarded.** Any browser-only code in shared utilities will cause server render failures. Use `typeof window !== 'undefined'` guards or move to `useEffect`.
- **Clerk session tokens are not available during the initial server render** of the TanStack Start frontend — the browser hasn't sent the JWT yet. This means data that requires auth cannot be prefetched server-side unless you use TanStack Start's server function or loader mechanism that has access to the request cookies.

---

## 2. Hono + Clerk: Middleware Order and orgId Extraction

### Package

Use `@hono/clerk-auth` (official Hono middleware package, hosted in the `honojs/middleware` monorepo).

```bash
pnpm add @hono/clerk-auth
```

Environment variables required in `apps/api`:
```
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
```

### Correct Middleware Order

The required global middleware order for `apps/api` is:

```typescript
import { cors } from 'hono/cors'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'

// 1. CORS — must come first so preflight requests are handled before auth
app.use('*', cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://ploutizo.app'
    : 'http://localhost:3000',
  credentials: true,
}))

// 2. Clerk — verifies JWT, attaches auth state
app.use('*', clerkMiddleware())

// 3. Tenant guard — custom middleware, rejects if orgId is null
app.use('*', tenantGuard())
```

### orgId Extraction Pattern

`getAuth(c)` returns the Clerk `Auth` object. The Auth object properties for this project:

| Property | Type | Notes |
|---|---|---|
| `userId` | `string \| null` | Null when unauthenticated |
| `orgId` | `string \| null` | Null when no active org — this is the tenancy guard |
| `orgRole` | `string \| null` | e.g. `"org:admin"` |
| `orgSlug` | `string \| null` | URL-friendly org identifier |
| `orgPermissions` | `string[] \| null` | Org-level permissions |
| `sessionId` | `string \| null` | Current session ID |
| `sessionClaims` | `JwtPayload` | Raw JWT claims |

```typescript
const tenantGuard = (): MiddlewareHandler => async (c, next) => {
  const { userId, orgId } = getAuth(c)
  if (!userId || !orgId) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401)
  }
  await next()
}
```

In route handlers:
```typescript
app.get('/accounts', (c) => {
  const { orgId } = getAuth(c)  // always non-null after tenantGuard
  // use orgId in all DB queries
})
```

### Clerk JWT Token Version Gotcha

Clerk deprecated **JWT token Version 1** on April 14, 2025. All new instances use **Version 2** which uses compact claim names:

| Claim | V1 (deprecated) | V2 (current) |
|---|---|---|
| Org ID | `org_id` | `o.id` |
| Org Role | `org_role` | `o.rol` |
| Org Slug | `org_slug` | `o.slg` |

The `@hono/clerk-auth` middleware handles JWT verification and exposes the normalized `Auth` object via `getAuth()` — you never read raw JWT claims directly. This means the v1/v2 difference is abstracted away as long as you use `getAuth(c)` rather than manually parsing `sessionClaims`.

**Confidence:** HIGH (Clerk Auth object docs + Hono clerk-auth README + Clerk JWT docs, all verified)

### CORS + Clerk Cookie Leakage

Clerk recommends setting `authorizedParties` to prevent subdomain cookie leakage attacks. For ploutizo, where `{subdomain}.ploutizo.app` subdomains exist, this is critical:

```typescript
app.use('*', clerkMiddleware({
  authorizedParties: ['https://ploutizo.app', /https:\/\/.*\.ploutizo\.app/]
}))
```

---

## 3. Drizzle + Neon: Connection Pooling and Transaction Patterns

### Driver Choice for `apps/api` (Node.js server, not edge/serverless)

`apps/api` runs as a persistent Node.js process on Railway — it is **not** a serverless function. This changes the driver recommendation:

| Driver | When to Use |
|---|---|
| `@neondatabase/serverless` (neon-http) | Edge functions, Cloudflare Workers, Vercel serverless — single short-lived connections only |
| `@neondatabase/serverless` (neon-websockets) | Serverless environments that need interactive transactions |
| `node-postgres` (`pg`) | **Persistent Node.js servers** — full SQL feature support, connection pooling via `pg.Pool` |
| `postgres.js` (`postgres`) | Persistent Node.js servers — faster than `pg`, better TypeScript support |

For `apps/api` on Railway (persistent Node.js process), use **`postgres.js`** or **`node-postgres`** rather than the neon-serverless driver. The neon-serverless HTTP driver does not support interactive transactions, which ploutizo needs for multi-step operations (e.g., creating a transaction + updating settlement balances atomically).

```typescript
// packages/db/src/client.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
```

### Neon Connection Pooling

Neon provides two connection string formats:
- **Direct connection:** `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname`
- **Pooled connection (PgBouncer):** `postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/dbname`

For a persistent Node.js server using `postgres.js` or `pg`, use the **direct connection** with the driver's built-in connection pool. PgBouncer (the pooled URL) adds an unnecessary extra hop. Only use the Neon pooler URL if:
- You're using the neon-serverless driver
- You have hundreds of concurrent Railway instances

The `postgres.js` driver manages its own connection pool by default (max 10 connections). For Railway Hobby plan with one instance, the defaults are fine.

**Transaction Gotcha:** Neon's PgBouncer pooler runs in **transaction mode** by default, which means:
- Prepared statements are not supported
- `SET` session variables don't persist
- `LISTEN`/`NOTIFY` doesn't work

If you ever switch to the pooled URL, you must disable prepared statements:
```typescript
const client = postgres(process.env.DATABASE_URL!, { prepare: false })
```

For direct connections (recommended), this is not needed.

### Migration Strategy

Use the generate + migrate workflow (not `push`) for production:

```bash
# Development: generate SQL migration files
pnpm db:generate  # drizzle-kit generate

# Development/staging: review generated SQL in drizzle/migrations/
# Production: apply migrations
pnpm db:migrate   # drizzle-kit migrate

# Dev only — push schema changes without migration files
pnpm db:push      # drizzle-kit push
```

The `drizzle-kit migrate` command uses its own migration tracking table (`__drizzle_migrations`) — it does not use Flyway/Liquibase. Run `db:migrate` as a Railway "Deploy Command" before the app starts, or as a pre-deploy step.

**Gotcha:** `drizzle-kit generate` requires a DB connection to introspect the current state when resolving conflicts. In CI, ensure `DATABASE_URL` is set (point at a Neon dev branch, not production).

**Confidence:** HIGH (Drizzle + Neon official docs verified)

---

## 4. Turborepo + Shared Packages: `@ploutizo/validators`

### Internal Package Strategy: Just-In-Time vs Compiled

Turborepo supports two internal package patterns:

1. **Just-In-Time (JIT) / source packages:** Apps import TypeScript source directly. No build step for the package. TypeScript resolves via `tsconfig` path aliases. Fastest DX — no `pnpm build` needed before consuming.

2. **Compiled packages:** Package has its own build step, outputs `dist/`. Apps import compiled JS. Slower DX but mirrors how published npm packages work.

For `@ploutizo/validators`, `@ploutizo/types`: **use JIT packages**. Zod schemas and TypeScript interfaces don't benefit from pre-compilation in a monorepo context. This eliminates the need to run `pnpm build --filter=validators` before the apps can import them.

JIT package `package.json` pattern:
```json
{
  "name": "@ploutizo/validators",
  "exports": {
    ".": "./src/index.ts"
  },
  "types": "./src/index.ts"
}
```

Apps that consume it declare it in their `package.json`:
```json
{
  "dependencies": {
    "@ploutizo/validators": "workspace:*"
  }
}
```

The consuming app's bundler (Vite for web, esbuild for api) transpiles the TypeScript from the package source directly.

### Circular Dependency Prevention

The import boundaries defined in CLAUDE.md are the correct ones. Never violate them — circular dependencies in a Turborepo monorepo cause `turbo build` to deadlock (the dependency graph cannot be resolved):

```
apps/web  → @ploutizo/ui, @ploutizo/validators, @ploutizo/types
apps/api  → @ploutizo/db, @ploutizo/validators, @ploutizo/types
@ploutizo/db → (nothing internal)
@ploutizo/ui → (shadcn/ReUI only)
@ploutizo/validators → @ploutizo/types (allowed)
@ploutizo/types → (nothing internal)
```

**Critical rule:** `@ploutizo/validators` may import from `@ploutizo/types` (for shared type assertions) but `@ploutizo/types` must never import from `@ploutizo/validators`. Types flow down, validators build on types.

### Build Order in `turbo.json`

For the JIT approach, the `build` pipeline only needs:
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".output/**", "dist/**"]
    }
  }
}
```

Since JIT packages have no build step, the build DAG resolves `apps/web` and `apps/api` independently (both depend on the workspace packages that produce no artifact). This is correct and expected.

**Confidence:** MEDIUM (Turborepo docs, training knowledge — direct Turborepo docs URLs were blocked during research)

---

## 5. Tailwind CSS v4: Breaking Changes Affecting shadcn/ui

### Critical Breaking Changes from v3 to v4

**Import syntax change** — this affects every CSS entry point file:
```css
/* v3 — REMOVE */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* v4 — USE */
@import "tailwindcss";
```

**PostCSS config change** — `tailwind.config.js` no longer exists in v4:
```js
// v4 — the plugin moved to a dedicated package
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
```

**Vite plugin (preferred over PostCSS for Vite apps):**
```ts
import tailwindcss from "@tailwindcss/vite"
export default defineConfig({ plugins: [tailwindcss()] })
```

TanStack Start uses Vite, so the Vite plugin is the correct approach.

**Utility renames (affect shadcn/ui components):**

| v3 class | v4 class |
|---|---|
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `blur-sm` | `blur-xs` |
| `rounded-sm` | `rounded-xs` |
| `outline-none` | `outline-hidden` |
| `ring` (3px blue) | `ring-3` (1px currentColor) |

**Important modifier change:**
```html
<!-- v3 -->
<div class="!flex !bg-red-500">
<!-- v4 -->
<div class="flex! bg-red-500!">
```

**Default color changes:**
- Border default changed from `gray-200` to `currentColor` — always specify border color explicitly: `border border-gray-200`
- Ring default changed from `3px blue-500` to `1px currentColor`

### shadcn/ui + Tailwind v4 Compatibility

shadcn/ui has Tailwind v4 support. The shadcn CLI (used via `pnpm dlx shadcn@latest add`) generates v4-compatible component code when it detects a v4 config. Key differences in the v4 shadcn setup:

- CSS variables are defined in `globals.css` using the new `@theme inline` block rather than `:root` variables + `tailwind.config.js` `extend.colors`
- The `cn()` utility (clsx + tailwind-merge) continues to work unchanged
- `cva` (class-variance-authority) is unaffected

**If the scaffold (`shadcn@latest init --preset b5cRMQsEM`) was generated with v4 in mind, it will already have the correct config.** Do not manually convert — run the scaffold as-is.

Run the upgrade tool if migrating from v3:
```bash
npx @tailwindcss/upgrade
```

**Confidence:** HIGH (Tailwind CSS v4 official upgrade guide, directly fetched)

---

## 6. React Query + TanStack Start: SSR Dehydration/Hydration and Auth Tokens

### How TanStack Start Integrates React Query

TanStack Start has a documented React Query integration. The pattern uses:
1. A server-side `queryClient` created per request (not shared across requests — each request gets a fresh client to avoid cross-request data leakage)
2. `prefetchQuery` in route `loader` functions to fetch data server-side
3. `dehydrate(queryClient)` to serialize the prefetched cache
4. `HydrationBoundary` on the client to restore the cache without re-fetching

### queryClient Setup Pattern

Create the queryClient in the root route context so it's available across the router:

```typescript
// apps/web/src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

// Server: fresh instance per request
// Client: singleton instance
export const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: false, // don't retry on server
    },
  },
})
```

### Bearer Token Injection Pattern

The critical pattern for injecting Clerk bearer tokens into all React Query requests:

```typescript
// apps/web/src/lib/queryClient.ts
import { useAuth } from '@clerk/tanstack-react-start'

// In a provider wrapping the app:
const { getToken } = useAuth()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const token = await getToken()
        const res = await fetch(`${import.meta.env.VITE_API_URL}${queryKey[0]}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      },
    },
  },
})
```

The `getToken()` call is async and returns the current session token — it does not re-fetch from the network if the token is cached. Tokens are short-lived (1 hour by default in Clerk), and `getToken()` automatically refreshes.

**SSR Gotcha with auth tokens:** During SSR, `getToken()` is not available on the server side in the same way as the browser (no cookie access in the Hono API from the TanStack Start SSR renderer). The standard approach:
- Non-auth-gated data (public routes) can be prefetched server-side
- Auth-gated data should be prefetched client-side OR you use TanStack Start server functions that have access to the Clerk server-side session cookie

For ploutizo, since all meaningful data is auth-gated (behind `orgId`), **don't over-invest in server-side prefetching**. The SSR pass renders the authenticated shell; data loads client-side via React Query. This is a valid and common approach.

### HydrationBoundary Pattern

```typescript
// Route file
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

export const loader = async () => {
  const queryClient = createQueryClient()
  // Only prefetch public or session-available data here
  await queryClient.prefetchQuery({ queryKey: ['/api/public-data'] })
  return { dehydratedState: dehydrate(queryClient) }
}

export const Component = () => {
  const { dehydratedState } = useLoaderData()
  return (
    <HydrationBoundary state={dehydratedState}>
      <MyDataComponent />
    </HydrationBoundary>
  )
}
```

**Confidence:** MEDIUM (React Query SSR docs conceptually verified, TanStack Start-specific docs returned 303 redirects during research — the pattern is documented but may have Start-specific nuances)

---

## 7. Clerk Satellite Domains for Subdomain-per-Tenant

### The Problem

ploutizo uses `{subdomain}.ploutizo.app` per household. Clerk sessions are scoped to a domain — a session authenticated at `ploutizo.app` must also be valid at `golden-newt.ploutizo.app`.

### Solution: Clerk Satellite Domains

Clerk supports this via **satellite domain configuration**:

- **Primary domain:** `ploutizo.app` — this is where sign-in/sign-up happens
- **Satellite domains:** `*.ploutizo.app` — these read authentication state from the primary

Configuration in `apps/web` for satellite routes:
```
VITE_CLERK_IS_SATELLITE=true
VITE_CLERK_SIGN_IN_URL=https://ploutizo.app/sign-in
```

The `satelliteAutoSync` option controls the UX trade-off:
- `false` (default): No redirect on first load. Sign-in redirect only on user action. Faster page loads but user may appear signed out on first visit to a new subdomain.
- `true`: Redirects to primary domain on first load to sync session. Slightly slower but more seamless.

For ploutizo, `satelliteAutoSync: true` is the better UX choice — users navigating directly to `golden-newt.ploutizo.app` should appear signed in immediately if they have a session.

**Additional requirement:** On the primary domain app (`ploutizo.app`), set `allowedRedirectOrigins` to include satellite domains:
```typescript
// ClerkProvider on primary domain
<ClerkProvider allowedRedirectOrigins={[/https:\/\/.*\.ploutizo\.app/]}>
```

**DNS requirement:** Each satellite subdomain needs a `CNAME` record for `clerk.{subdomain}.ploutizo.app` in production. In development, Cloudflare handles this automatically via your DNS configuration.

**Confidence:** MEDIUM-HIGH (Clerk satellite domains docs verified, TanStack Start + Clerk quickstart confirmed framework support)

---

## Key Gotchas

- **Clerk JWT v1 deprecated April 2025.** Raw claim names changed — `org_id` is now `o.id` in the JWT payload. Always use `getAuth(c)` on the API side, never read `sessionClaims.org_id` directly.

- **Neon pooler URL (PgBouncer) breaks prepared statements.** Use the direct connection URL in `apps/api` (persistent Node.js process) with `postgres.js` built-in pool, not the `-pooler.` URL.

- **Tailwind v4 border/ring defaults changed.** `border` without a color now renders `currentColor` (invisible on white backgrounds). Always write `border border-gray-200` not just `border`. shadcn/ui components generated by the CLI already handle this, but hand-written utility classes are affected.

- **Tailwind v4 `!important` modifier reversed.** Postfix only: `class!` not `!class`. Any v3 patterns with `!flex` must become `flex!`.

- **TanStack Start is RC.** Lock dependency versions. Check the GitHub changelog before `pnpm update`. The `tanstack.com/router` docs redirect frequently — the docs URL structure may change with v1 GA.

- **orgId is null when no active organization.** A user who signs in but has not yet selected/been assigned an org will have `orgId: null`. The `tenantGuard()` middleware handles this as a 401, but the client needs to handle the "no org yet" state by routing to org creation.

- **CORS must precede Clerk middleware on Hono.** If Clerk runs before CORS, `OPTIONS` preflight requests will be rejected (no `orgId`, triggers tenant guard 401).

- **Satellite domain cookie leakage risk.** Without `authorizedParties` in `clerkMiddleware()`, any subdomain could potentially leak session state. Always configure this in production.

- **Turborepo JIT packages require the consuming app's bundler to handle `.ts` imports.** Vite handles this natively. The Hono API (if using esbuild or tsx) also handles it. Do not configure `"main": "dist/index.js"` for JIT packages — use `"exports": { ".": "./src/index.ts" }` only.

- **drizzle-kit `generate` needs a DB connection.** Set `DATABASE_URL` in CI to a Neon dev branch, not production. Never run `db:generate` against the production Neon database.

- **React Query on SSR with auth-gated data:** All ploutizo data is org-gated. Do not over-engineer server-side prefetching. Let the SSR pass render the authenticated shell and skeleton states; data loads client-side via React Query. This is the pragmatic correct approach for this app.

---

## Recommendations

- **Railway services:** Set up `apps/web` and `apps/api` as separate Railway services within one project. Set Root Directory to repo root, override build/start commands per service using `--filter`.

- **Node.js adapter for TanStack Start:** No special configuration needed for Railway. Ensure `PORT` env var is read by the start server (it is by default in Vinxi/TanStack Start).

- **Use `postgres.js` not `@neondatabase/serverless`** in `apps/api`. The API is a persistent Node.js server, not a serverless function. Use the direct Neon connection URL, not the pooler URL.

- **Run `pnpm db:migrate` as a Railway pre-deploy command** for `apps/api`, not as application startup code. This ensures migrations complete before traffic is routed.

- **Keep `@ploutizo/validators` and `@ploutizo/types` as JIT packages.** Export from `src/index.ts`, not `dist/`. This eliminates a build step and keeps the DX fast.

- **Configure `authorizedParties` in `clerkMiddleware()`** from day one. Do not ship without this — subdomain cookie leakage is a real attack vector when you have `*.ploutizo.app` subdomains.

- **Use Clerk satellite domains** (`satelliteAutoSync: true`) for subdomain-per-household. Set up DNS CNAME records early in production.

- **For React Query auth token injection:** Use a custom default `queryFn` at the `QueryClient` level that calls `getToken()` on every request. This is cleaner than passing tokens through `useQuery` options on each call site.

- **Use the Vite plugin for Tailwind v4** (`@tailwindcss/vite`) in `apps/web`, not the PostCSS plugin. TanStack Start uses Vite; the Vite plugin is faster and more idiomatic.

- **Run `npx @tailwindcss/upgrade` immediately** if the scaffold used v3 conventions. Do not manually edit class names — use the automated upgrade tool.

- **Never read `sessionClaims.org_id`** — use `getAuth(c).orgId` which is correctly mapped from the v2 JWT's `o.id` claim by the middleware.
