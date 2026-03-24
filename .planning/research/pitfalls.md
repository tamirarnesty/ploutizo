# Pitfalls Research

**Domain:** Personal finance tracker — TypeScript monorepo (TanStack Start + Hono + Neon + Clerk + Drizzle)
**Researched:** 2026-03-24
**Overall confidence:** MEDIUM-HIGH (official docs verified for most claims; Neon connection limits not directly confirmed due to access restrictions)

---

## 1. Clerk + Hono in Production: JWT Verification Failures and orgId Edge Cases

### The orgId-null production trap

**What happens:** `orgId` is `undefined` (not null) in the Clerk auth object whenever a user has no active organization set in their current session. This is structural — when no org is active, the JWT's `o` claim is entirely absent. The `clerkMiddleware()` in Hono attaches the auth object to context, but the `tenantGuard()` middleware must check for `orgId` being falsy (undefined or null), not just `=== null`.

**Why it happens:** Clerk session tokens (v2) only include the `o` claim (`{ id, rol, per, slg, fpm }`) when an active organization is set. This happens during:
- First login before the user has accepted an org invitation
- After a user removes themselves from their only org
- When a JWT was issued before `setActive({ organization })` completed on the frontend
- During the race window after org switch but before the new token has been issued and the old one expired

**The race condition on org switch:** When `setActive({ organization: newOrg })` is called, the current JWT still has the old `orgId` until it expires (short-lived token) and a new one is fetched. During this window (typically seconds), any in-flight API requests carry the stale token with the wrong `orgId`. With Clerk's default token lifetime, this window is small but real. Settlement and transaction mutations that fire right as the user switches households will silently operate on the wrong org's data if `orgId` is sourced from the JWT claim but the UI has already switched context.

**The dev-vs-production session architecture difference:** Development instances use `__clerk_db_jwt` querystring tokens instead of secure same-site `HttpOnly` cookies. This means authentication flow that works in dev (where the querystring token is automatically forwarded) can silently fail in production where the cookie approach requires correct `authorizedParties` configuration and domain alignment.

**JWT clock skew:** `authenticateRequest()` has a built-in 5-second (`clockSkewInMs: 5000`) tolerance by default. Railway containers may have slightly drifted clocks — if clock drift exceeds 5 seconds, every JWT verification will return a `signed-out` status rather than an error, causing a complete auth failure that looks like "user is not logged in" rather than "clock error."

**Production key migration gotcha:** Development Clerk keys are prefixed `pk_test_` / `sk_test_`; production keys are `pk_live_` / `sk_live_`. The env var names used in Hono middleware (`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`) differ from the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` convention used in Next.js examples found in most blog posts. Using the wrong variable name in Railway env vars causes silent auth failure — Hono will receive `undefined` for the key and fall back to no-op behavior rather than throwing at startup.

**`authorizedParties` missing:** Without explicitly setting `authorizedParties` in `authenticateRequest()`, the API is vulnerable to subdomain cookie leaking. More critically, in production with a subdomain-based multi-tenant setup (`{slug}.ploutizo.app`), failing to set this correctly may cause legitimate requests from tenant subdomains to be rejected as unauthorized.

**Prevention:**
- `tenantGuard()` must check `!orgId` (falsy), not `orgId === null`
- Set `authorizedParties: ['https://ploutizo.app', 'https://*.ploutizo.app']` in Hono middleware config
- Verify Railway container NTP sync — add a clock-skew health check or bump `clockSkewInMs` to 10000ms
- In development, test with `pk_test_` keys; add a startup assertion that `CLERK_SECRET_KEY` is defined and non-empty
- On the frontend, disable API mutations during the org-switch transition (disable query while `isLoaded === false` or during `setActive` call)

**Confidence:** HIGH (verified with official Clerk auth object documentation and deployment docs)

---

## 2. Neon Connection Limits and Pooling with Drizzle + Hono on Railway

### HTTP driver does not support transactions

**What happens:** `drizzle('neon-http')` — the connection format used in most Neon + Drizzle quickstart examples — does not support multi-statement transactions. Calling `db.transaction(async (tx) => { ... })` with the HTTP driver either silently executes statements non-atomically or throws at runtime. For ploutizo, this is critical: recording a settlement, updating split amounts, and creating the transaction assignees rows must be atomic.

**Why it happens:** The `neon-http` driver sends each query as a discrete HTTP request. There is no persistent connection over which to issue `BEGIN` / `COMMIT` / `ROLLBACK`. The `neon-serverless` (WebSocket) driver supports full interactive transactions because it maintains a persistent connection.

**Prevention:** Use `drizzle('neon-serverless')` with `@neondatabase/serverless` for the Hono API. This requires additional Node.js WebSocket configuration:
```typescript
import ws from 'ws'
import { neonConfig } from '@neondatabase/serverless'
neonConfig.webSocketConstructor = ws
```
Add `ws` and `bufferutil` as dependencies in `apps/api/package.json`. Without this, connections in Node.js (non-edge) environments will fail silently or throw a `WebSocket is not defined` error.

### Connection limits

**What happens:** Neon enforces connection limits per compute endpoint. The free tier allows approximately 100 connections total per project (across all branches and endpoints). Paid tiers scale higher but are still bounded. A long-running Hono server on Railway that creates a new `drizzle` instance per request — or that opens a connection pool larger than the limit — will receive `too many clients already` errors from Postgres.

**Why it happens:** Unlike traditional PaaS where the server process is persistent and connection pools are initialized once, Railway deployments restart on deploy. If each restart initializes a large pool, and old instances haven't drained connections yet during rolling restarts, connection counts spike.

**Prevention:**
- Initialize the Drizzle client once at module scope, not per-request
- Neon provides a built-in PgBouncer pooler accessible via a separate `-pooler` connection string suffix (e.g., `ep-xyz-pooler.us-east-2.aws.neon.tech`). Use this pooler URL in `DATABASE_URL` for production. The pooler runs in transaction mode, meaning each query borrows a backend connection only for the duration of that query, dramatically reducing simultaneous connections
- Keep Hono's server as a persistent process (Railway's default), not a serverless function, to benefit from a single long-lived connection pool
- Set `max` in the pool config to a conservative value (e.g., 10–20) rather than the driver default

**Confidence:** MEDIUM (transaction limitation confirmed by official Drizzle-Neon docs; specific connection limit numbers not directly confirmed due to access restrictions — treat as requiring validation against current Neon plan page)

---

## 3. TanStack Start SSR + Clerk Auth: Hydration Mismatches and Auth Flash

### The auth-flash problem

**What happens:** On initial page load, TanStack Start renders HTML on the server. If server-side code doesn't have Clerk session context (because the session cookie hasn't been passed to the server render, or the Clerk provider hasn't initialized), the server renders the "unauthenticated" state. The client then hydrates with the authenticated state, causing a visible flash of the sign-in page or blank content before the correct authenticated UI appears.

**Why it happens:** Clerk's `isLoaded` state starts as `false` until the Clerk.js SDK has initialized and validated the session on the client. SSR pages that render based on `isSignedIn` without checking `isLoaded` will always render the "signed out" state server-side and then flash to "signed in" state on the client.

**The fix pattern:**
```typescript
// Wrong — causes flash
if (!isSignedIn) return <SignIn />

// Correct — wait for Clerk to load
if (!isLoaded) return null  // or a loading skeleton
if (!isSignedIn) return <SignIn />
```

**TanStack Start SSR + Clerk interaction:** TanStack Start's SSR mode (via `@tanstack/start`) renders routes on the server using `createStartHandler`. For Clerk to work correctly in SSR, the Clerk provider must be initialized with the server-side session state passed as props. Without this, every SSR render produces unauthenticated HTML regardless of the user's actual session state. Clerk's TanStack Start integration uses `getAuth()` in server functions to read the session — this must be called in `createServerFn` or loader functions, not in component code.

**Hydration mismatch with auth-dependent renders:** If a component renders different HTML based on auth state (e.g., shows "Dashboard" for authenticated users, "Sign In" for others), and the server renders the unauthenticated version while the client renders the authenticated version, React will emit a hydration warning and may cause layout shifts. The standard mitigation is to always render the same "loading" skeleton server-side and defer auth-dependent content to client-side rendering.

**Active organization loading race:** `useOrganization()` has its own `isLoaded` flag separate from `useAuth()`. The organization data loads after the user is authenticated. Components that use `organization.id` or `organization.name` without checking `isLoaded` will briefly render with undefined values. For ploutizo's household-switcher and all data displays, always guard on `useOrganization().isLoaded` before rendering org-specific content.

**Prevention:**
- Every protected route must check `isLoaded` before `isSignedIn`
- Use TanStack Start's `beforeLoad` with `getAuth()` for server-side auth gating rather than client-side conditional rendering
- Render a neutral loading state on the server for all auth-gated content (avoids the flash entirely)
- Never use `organization.id` without checking `useOrganization().isLoaded`

**Confidence:** MEDIUM (verified with Clerk auth object docs and TanStack Start SSR docs; specific Clerk + TanStack Start integration details have limited official coverage)

---

## 4. Drizzle Migrations in Production: Migrate vs Push and Zero-Downtime

### Never use `push` in production

**What happens:** `drizzle-kit push` directly synchronizes your TypeScript schema to the database without generating migration files. It is destructive in cases where it needs to drop and recreate columns or tables. Critically, it provides no rollback path and no audit trail of what changed.

**When to use each:**
- `push` — local dev only, when the database is throwaway (branch databases, dev Neon branches). Fast iteration, no migration file management overhead
- `generate` + `migrate` — any shared environment: staging, production. Generates SQL files to `packages/db/drizzle/`, which should be committed. `migrate` applies only the not-yet-applied files

**Zero-downtime migration patterns for this app:**
1. **Additive-only changes are safe:** Adding a new nullable column, adding a new table, adding an index concurrently — no downtime needed
2. **Rename = two-phase:** Never rename a column in a single migration. Phase 1: add the new column, deploy app code that reads both old and new. Phase 2: backfill, drop old column, deploy app code that only uses new column
3. **`CREATE INDEX CONCURRENTLY`:** Drizzle's generated SQL for indexes is `CREATE INDEX`, not `CREATE INDEX CONCURRENTLY`. Large tables (transactions) will lock during index creation. Write a custom migration SQL file for `CONCURRENTLY` indexes
4. **Neon branching for migration safety:** Use Neon's branch feature to test migrations against a copy of production data before applying to the main branch

**The CI/CD migration timing problem:** If migrations run before the new app code is deployed (standard practice), there's a window where old app code runs against a new schema. If migrations run after, new app code runs against old schema. The safest pattern for this app:
- Migrations run at container startup via a `prestart` script
- New app code must be backward-compatible with the schema state before the migration runs (i.e., new columns must have defaults or be nullable)
- Old code must continue to work after the migration runs (i.e., old columns still exist during the transition)

**Migration file conflicts in teams:** Two developers generating migrations from different schema states can produce conflicting files with the same sequential number. `drizzle-kit check` detects commutativity conflicts. Always run `drizzle-kit check` in CI before applying migrations. Squash migration conflicts before merging to main.

**Confidence:** HIGH (verified with official Drizzle documentation)

---

## 5. pnpm Workspace + Turborepo Gotchas: TypeScript and Hot Reload

### Package boundary import errors at runtime

**What happens:** TypeScript's `paths` resolver and the Node.js module resolver behave differently. A package boundary that appears to work in `tsc` may fail at runtime if the package's `exports` field in `package.json` is misconfigured. With `pnpm` workspaces, packages are symlinked from `node_modules/@ploutizo/db` to `packages/db`. If `packages/db/package.json` doesn't correctly set `exports` pointing to the built output (or to the source with a TypeScript-aware build setup), imports will resolve at type-check time but throw `MODULE_NOT_FOUND` at runtime.

**Prevention:**
- Each package in `packages/` must have `exports` pointing to either compiled output (`.js` files) or use a tool-aware path (`./src/index.ts` with `tsup` or `tsx` supporting it directly)
- For `@ploutizo/db`, `@ploutizo/validators`, `@ploutizo/types`: use `"main": "./src/index.ts"` with `tsx` or `tsup --watch` in dev; `"main": "./dist/index.js"` in build
- The shadcn monorepo preset (`b5cRMQsEM`) likely pre-configures this — verify the generated `packages/*/package.json` before adding custom packages

### Hot reload across packages in dev

**What happens:** Turborepo's `pnpm dev` runs all workspaces in parallel. When you edit `packages/validators/src/transaction.ts`, `apps/api` and `apps/web` don't automatically pick up the change unless they're watching the package source. This leads to dev-only confusion where you edit a validator and the API still validates with the old schema.

**Why it happens:** Turborepo's dev pipeline runs tasks in dependency order but each process has its own watcher. If `packages/validators` compiles to `dist/` and only that compiled output is imported, the consuming apps need to watch `packages/validators` for rebuilds.

**Prevention:**
- Use TypeScript project references (`composite: true`) combined with `tsc -b --watch` in each package's dev script, OR
- Use path aliases pointing to source (`"@ploutizo/validators": ["../../packages/validators/src/index.ts"]`) in each app's `tsconfig.json` — this makes the consuming app's bundler (Vite / esbuild) directly watch the source files, eliminating the intermediate compile step
- Verify `turbo.json` pipeline has `dependsOn: ["^dev"]` for the dev task so packages start in dependency order

### TypeScript strict mode cross-package

**What happens:** If `packages/types` exports a type that differs from what `apps/api` imports (e.g., due to different `strictNullChecks` settings across `tsconfig.json` files), type errors may appear in one workspace but not another, and may only surface during full `pnpm typecheck`, not during individual `tsc` runs.

**Prevention:**
- Create a root `tsconfig.base.json` with strict settings; extend it in all packages and apps
- Run `pnpm typecheck` (which runs `tsc` across all packages) in CI, not just per-package type checks

**Confidence:** MEDIUM (based on common Turborepo/pnpm workspace patterns; specific behavior of the shadcn preset not directly verified)

---

## 6. Tailwind v4 + shadcn: Incompatibilities and CSS Variable Changes

### Critical CSS variable renames (v3 → v4)

**What happens:** Tailwind v4 changed all theme value references. Code using `var(--tw-*)` prefixed variables from v3 (e.g., `var(--tw-color-red-500)`) will break in v4, where the new convention is `var(--color-red-500)` (no `tw-` prefix, unless a prefix is explicitly configured). shadcn/ui components that were written for v3 and use `hsl(var(--background))` or `rgb(var(--foreground))` CSS variable patterns are still compatible because shadcn uses its own semantic variables (`--background`, `--foreground`, `--primary`, etc.) rather than Tailwind's raw color variables. However, any custom overrides that reference Tailwind's internal variables directly will break.

**Scale rename trap:** Tailwind v4 renamed the shadow and rounded scale:
- `shadow-sm` in v3 → `shadow-xs` in v4
- `shadow` in v3 → `shadow-sm` in v4
- `rounded-sm` in v3 → `rounded-xs` in v4

If shadcn components were copied before these renames, they will render with wrong sizes silently (no error, just incorrect styling).

**Ring default changed:** In v3, `focus:ring` applied a 3px blue ring. In v4, `focus:ring` applies a 1px currentColor ring. Any component relying on v3 focus ring behavior (e.g., input focus states) will have visually different (thinner, same-color-as-text) focus rings in v4 without explicitly specifying `focus:ring-3 focus:ring-blue-500`.

**Border default changed:** In v3, `border` defaulted to `gray-200`. In v4, it defaults to `currentColor`. Any component that uses `border` without a color class (e.g., `<div className="border">`) will render with a currentColor border instead of the expected gray.

**The `outline-none` → `outline-hidden` change:** Accessibility-relevant: `outline-none` in v4 still works but `outline-hidden` is the new semantically correct way to visually hide outlines while keeping them accessible. This is not a breaking change, but is worth knowing for new components.

**shadcn + Tailwind v4 support status:** shadcn has updated its CLI and components for Tailwind v4 compatibility. The `shadcn@latest init` command with recent versions generates v4-compatible code. However, the `packages/ui` approach (installing shadcn components into a shared package) requires that the consuming app (`apps/web`) owns the Tailwind configuration — components in `packages/ui` must not have their own `tailwind.config`. This is the standard shadcn monorepo pattern, but if broken, components will render with no styles.

**Prevention:**
- After scaffolding, run `pnpm dlx @tailwindcss/upgrade` to catch v3-to-v4 renames automatically
- Verify shadcn's `components.json` in `apps/web` points to the correct paths and aliases
- `packages/ui` should export raw TSX components without their own Tailwind processing — styles are applied by the consuming app's Tailwind setup
- Add explicit colors to all `border` and `ring` usage

**Confidence:** HIGH for v4 breaking changes (official Tailwind upgrade guide); MEDIUM for shadcn-specific behavior (limited official coverage, relies on community knowledge)

---

## 7. React Query + Optimistic Updates for Finance Data: Stale Balance Displays

### The balance staleness problem

**What happens:** After a user creates a transaction (e.g., a $300 settlement), the settlement card still shows the old outstanding balance until the query refetches. With a 5-minute `staleTime`, this could persist for the entire session. Users will think their settlement wasn't recorded.

**Why it happens:** React Query caches responses by query key. A `useMutation` for creating a transaction doesn't automatically invalidate the `['balances', orgId]` or `['settlement', accountId]` queries. Without explicit invalidation, the cache serves stale data.

**The optimistic update pitfall for financial data:** Optimistic updates (updating the cache before the server confirms) are tempting for balance displays, but dangerous for financial data:
- If the mutation fails and rolls back, users see a flash of incorrect balance
- If two mutations fire close together (race condition), the second optimistic update may be based on stale local state, not the current server state
- Partially-failed transactions (e.g., DB write succeeds but network times out before the response returns) leave the client in a state where it rolled back the optimistic update but the server actually committed

**Recommended pattern for finance mutations:**
1. Do NOT use `onMutate` optimistic cache updates for balances, totals, or any derived financial values
2. Use `onSettled` (runs whether mutation succeeds or errors) to invalidate and refetch all related queries:
```typescript
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['balances', orgId] })
  queryClient.invalidateQueries({ queryKey: ['transactions', orgId] })
  queryClient.invalidateQueries({ queryKey: ['budgets', orgId] })
}
```
3. Use `isMutating` to show a loading state on the balance card while the refetch is in progress
4. The momentary "stale then updated" sequence is preferable to the "optimistic then rollback" flash for financial UIs

**Query key hierarchy matters:** If transaction mutations are scoped to `['transactions', orgId, filters]` and balance queries are `['balances', orgId, accountId]`, `invalidateQueries({ queryKey: ['transactions', orgId] })` will invalidate all transaction queries for the org (because React Query uses prefix matching). Design query keys to exploit this: `[resource, orgId, ...specifics]` allows org-level invalidation with a single key prefix.

**The double-render trap with React Query + Suspense:** TanStack Query's `suspense: true` option throws a Promise to Suspense. If the Suspense boundary is placed outside the component that fires the mutation, the loading state during refetch will suspend the entire Suspense tree, causing components that don't depend on the refetched query to also unmount and remount. Keep mutation-triggered refetches scoped to the queries that need them, and place Suspense boundaries close to the components that consume the data.

**Confidence:** HIGH (verified with official React Query documentation on optimistic updates and query invalidation)

---

## 8. Railway Deployment: Monorepo Environment Variables and Health Checks

### Per-service environment variable isolation

**What happens:** Railway projects support multiple services, each with independent environment variables. However, in a Turborepo monorepo deployed as a single Railway project, both `apps/web` and `apps/api` run as separate services. If Railway's build step is configured to run `pnpm build` at the repo root (Turborepo builds both), both services share the same build environment but must have different runtime environment variables (`DATABASE_URL` in `apps/api` but not in `apps/web`; `VITE_API_URL` in `apps/web` but not in `apps/api`).

**The secret leakage risk:** `VITE_*` prefixed variables in Vite are embedded into the built JavaScript bundle at build time and sent to every browser visitor. If `DATABASE_URL` or `CLERK_SECRET_KEY` are accidentally prefixed with `VITE_` in `apps/web`'s build environment on Railway, they will be exposed publicly. Railway allows setting env vars at the project level (shared across all services) vs. per-service level. Never put `DATABASE_URL` or any secret at the project level if it could be picked up by the `apps/web` Vite build.

**Build root directory:** Railway needs to know the root of each service for `pnpm install` and the start command. For a Turborepo setup, the correct configuration is:
- Build command at repo root: `pnpm build --filter=apps/api` (or `apps/web`)
- Start command: `node apps/api/dist/index.js` (or equivalent)
- Without specifying `--filter`, Railway's `pnpm build` will build both apps, wasting build minutes

### Health check configuration

**What happens:** Railway requires a health check endpoint to determine when a container is ready to receive traffic. Without one, Railway uses a fixed startup delay. If Hono API takes longer than expected to start (e.g., waiting for DB connection pool to warm up), Railway may route traffic before the API is ready, causing 502 errors in the first seconds after deployment.

**Recommendation:**
- Add `GET /health` to Hono that returns `{ status: 'ok' }` with 200 immediately (before DB is ready) and optionally include a DB ping variant at `/health/ready`
- Configure Railway's health check path to `/health` with a 30-second timeout
- For TanStack Start on web, Railway can use the default HTTP check against the root path

### pnpm + Railway build cache

**What happens:** Railway caches `node_modules` between builds. With pnpm workspaces, the `.pnpm-store` is the relevant cache. If Railway is not configured to cache the correct directory, every build runs a full `pnpm install` (slow). More critically, if the cache is stale after a `lockfile` change but Railway doesn't invalidate it, builds may use wrong dependency versions.

**Prevention:**
- Verify Railway's cache settings include the pnpm store path
- Use `pnpm install --frozen-lockfile` in the build step to ensure reproducibility and catch lockfile drift

**Cloudflare proxy + Clerk cookie issue:** When `ploutizo.app` is proxied through Cloudflare, the DNS record for the Clerk frontend API subdomain (`clerk.ploutizo.app`) must be set to "DNS only" (grey cloud), not "Proxied" (orange cloud). Cloudflare's proxy changes headers in ways that can break Clerk's session management in production. Clerk's deployment docs explicitly call this out.

**Confidence:** MEDIUM (Railway env var isolation and health check behavior from general knowledge + Clerk deployment docs; specific Railway pnpm cache path needs validation against Railway's current docs)

---

## Critical Pitfalls (must address before writing code)

- **`neon-http` driver does not support transactions.** Use `neon-serverless` (WebSocket) driver for all Hono API connections. Configure `neonConfig.webSocketConstructor = ws` in Node.js. Every multi-step write (transaction + assignees, settlement, import batch + transactions) requires a real DB transaction.

- **`orgId` is `undefined` (not `null`) when no active org is set in Clerk.** The `tenantGuard()` middleware must use `!orgId` (falsy check). Users who sign in without an active org, or whose org cookie expired, hit this state before being redirected to org selection.

- **Clock skew between Railway containers and Clerk's JWT verification.** Bump `clockSkewInMs` from the default 5000ms to at least 10000ms in `authenticateRequest()` config. Silent auth failures from clock drift are extremely hard to debug in production.

- **Tailwind v4 `border` and `ring` defaults changed.** Every shadcn component using `border` without an explicit color, or `ring` / `focus:ring` without explicit width and color, will render differently from the shadcn design intent. Audit all `border` and `focus:ring` usage after scaffolding.

- **`VITE_*` variables are embedded in the browser bundle at build time.** Never set `DATABASE_URL`, `CLERK_SECRET_KEY`, or any server-only secret in `apps/web`'s Railway environment. Enforce at the Railway project vs. per-service environment variable level.

- **Development Clerk keys (`pk_test_`) must switch to production keys (`pk_live_`) before first real user signup.** The development instance is capped at 100 users and uses querystring-based session tokens that are incompatible with production cookie-based auth. Do not attempt to migrate development user data to production — Clerk explicitly states this is not supported.

- **Set `authorizedParties` in Clerk's `authenticateRequest()`.** Without this, tenant subdomain requests (`{slug}.ploutizo.app`) may be rejected or (worse) may allow subdomain cookie leaking attacks.

---

## Watch List (monitor during development)

- **Neon WebSocket connection pool exhaustion:** Watch for `too many clients already` errors in Railway logs, especially during deploys (when old containers drain while new ones start). Consider adding a `/health/ready` check that pings the DB, and tune the pool `max` setting down.

- **TanStack Start SSR + Clerk `isLoaded` flash:** Every protected page should be tested with the browser's network throttled to see if auth flash occurs. If it does, the loading check is missing.

- **React Query stale balance after mutations:** After every mutation that affects monetary values (create transaction, record settlement, edit split), manually verify the displayed balances update. Add integration tests that assert query invalidation fires correctly.

- **Drizzle migration file conflicts:** If two branches touch `packages/db/schema/`, the generated migration files will conflict on merge. Run `drizzle-kit check` in CI before every migration. Adopt a policy of one schema-changing branch at a time, or use custom migration file naming.

- **`space-x-*` and `space-y-*` selector change in Tailwind v4:** The underlying CSS selector changed from `> :not([hidden]) ~ :not([hidden])` to `> :not(:last-child)`. This changes spacing behavior when elements are dynamically hidden (e.g., conditional transaction rows). Test all tables and lists that show/hide rows dynamically.

- **ReUI component compatibility with Tailwind v4:** ReUI (`@reui/*`) is shadcn-based. As of 2026-03, ReUI's Tailwind v4 compatibility status should be verified before `DataGrid` and `Filters` are integrated — these are used for the core transaction list and import review table, making a styling regression here high-impact.

- **`drizzle-kit push` accidentally used in production:** Enforce `push` is dev-only via documentation and CI check. Consider adding a guard in `packages/db/package.json` that prevents `db:push` from running when `NODE_ENV=production`.

- **Recurring transaction generation on page load (v2 scope, but schema affects v1):** The `recurring_templates` table is in scope but generation logic is deferred. Ensure schema reserved for v2 doesn't interfere with v1 migrations or add nullable complexity that trips up v1 queries.

---

## Sources

- Clerk Auth Object reference: https://clerk.com/docs/references/backend/types/auth-object (HIGH confidence)
- Clerk deployment guide: https://clerk.com/docs/deployments/overview (HIGH confidence)
- Clerk authenticateRequest: https://clerk.com/docs/references/backend/authenticate-request (HIGH confidence)
- Drizzle + Neon connection guide: https://orm.drizzle.team/docs/connect-neon (HIGH confidence)
- Drizzle migrate command: https://orm.drizzle.team/docs/drizzle-kit-migrate (HIGH confidence)
- Tailwind v4 upgrade guide: https://tailwindcss.com/docs/upgrade-guide (HIGH confidence)
- React Query optimistic updates: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates (HIGH confidence)
- Neon connection limits: neon.com/docs (MEDIUM confidence — specific plan limits not directly verified)
- Turborepo TypeScript guide: turbo.build/repo/docs (MEDIUM confidence — access restricted)
- Railway monorepo deployment: docs.railway.app (MEDIUM confidence — access restricted, based on general Railway knowledge)
