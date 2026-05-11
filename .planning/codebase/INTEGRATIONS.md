# External Integrations

**Analysis Date:** 2026-05-11

## APIs & External Services

**Authentication:**
- Clerk — User auth, org-based multi-tenancy, JWT issuance
  - SDK (web): `@clerk/tanstack-react-start` — `ClerkProvider`, `useAuth`, `auth()` server fn
  - SDK (api): `@clerk/hono` — `clerkMiddleware()` JWT verification middleware
  - SDK (ui): `@clerk/ui` — Themed Clerk sign-in/sign-up components
  - SDK (backend): `@clerk/backend` — Type imports for webhook event payloads
  - Auth: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - Web entry: `apps/web/src/start.ts` — `clerkMiddleware()` wired as request middleware
  - API entry: `apps/api/src/index.ts` — `clerkMiddleware({ secretKey, publishableKey, clockSkewInMs: 10000, authorizedParties })`
  - Authorized parties: `https://ploutizo.app`, `http://localhost:3000` (static list + regex for subdomains)

## Data Storage

**Databases:**
- Neon (PostgreSQL serverless)
  - Connection: `DATABASE_URL` env var
  - Client: `@neondatabase/serverless` WebSocket Pool (`neonConfig.webSocketConstructor = globalThis.WebSocket`)
  - ORM: Drizzle ORM (`drizzle-orm/neon-serverless`)
  - Client definition: `packages/db/src/client.ts`
  - Schema definition: `packages/db/src/schema/index.ts`
  - Migrations: `drizzle-kit` via `drizzle.config.ts` (root); output at `packages/db/drizzle/`
  - **CRITICAL:** `neonConfig.webSocketConstructor` must be set BEFORE constructing the Pool

**File Storage:**
- Not detected

**Caching:**
- TanStack Query in-memory cache (client-side SPA only) — 60s global `staleTime`

## Authentication & Identity

**Auth Provider:** Clerk
- Tenancy model: Organization-based (Clerk org ID = tenant ID)
- JWT flow: Clerk issues JWTs → `apiFetch` in `apps/web/src/lib/queryClient.ts` attaches `Authorization: Bearer <token>` header → `@clerk/hono` `clerkMiddleware` verifies on API
- Token getter: wired at app init via `setTokenGetter()` in `apps/web/src/routes/__root.tsx` (`TokenInitializer` component)
- Tenant guard: `apps/api/src/middleware/tenantGuard.ts` — applied to `/api/*` routes only, not `/health` or `/webhooks`
- Route guards (web): `authGuard` and `orgGuard` server functions in `apps/web/src/routes/__root.tsx` — redirect to `/sign-in/$` or `/onboarding` respectively

## Webhooks

**Incoming (Clerk → API):**
- Endpoint: `POST /webhooks/clerk` (`apps/api/src/routes/webhooks.ts`)
- Signature verification: Svix library (`svix` 1.90.x) — `CLERK_WEBHOOK_SECRET` env var
  - Middleware: `apps/api/src/middleware/webhookAuth.ts` — reads raw body (`c.req.text()`) to preserve HMAC integrity
- Handler: `apps/api/src/services/webhooks.ts` — `dispatchWebhookEvent()`
- Events handled:
  - `organization.created` → inserts org + seeds default data (`seedOrg`)
  - `organization.updated` → updates org name/image
  - `user.created` → inserts user record (email, name, image)
  - `user.updated` → updates user record
  - `organizationMembership.created` → inserts `orgMembers` row, role hardcoded to `'admin'` (v1)
  - All other event types silently ignored
- **NOT tenant-guarded** — no Clerk JWT on webhook requests from Svix

**Outgoing:**
- None detected

## Monitoring & Observability

**Error Tracking:** Not detected

**Logs:**
- `console.error('[API] Unhandled error:', err)` in `apps/api/src/index.ts` global error handler
- No structured logging library

## CI/CD & Deployment

**Hosting:** Railway
- Both apps deployed to Railway (`apps/api/railway.toml`, `apps/web/railway.toml`)
- Builder: RAILPACK for both apps
- Region: `us-east4-eqdc4a` (1 replica each)
- API pre-deploy: `pnpm db:migrate` (runs Drizzle migrations before each deploy)
- API health check: `GET /health` (`apps/api/src/routes/health.ts`)
- API start: `node apps/api/dist/index.js`
- Web start: `node apps/web/.output/server/index.mjs`
- Restart policy: `ON_FAILURE`, max 3 retries (both apps)

**CI Pipeline:** GitHub Actions (`.github/workflows/ci.yml`)
- Trigger: pull requests + push to `main`
- Jobs: `lint-typecheck`, `test`, `format-check`, `build` (all run in parallel on `ubuntu-latest`)
- Node: 22.14.0, pnpm: 9.15.9 (exact versions pinned)
- Installs with `--frozen-lockfile`

## CORS

**Allowed origins (API):**
```
https://ploutizo.app
https://www.ploutizo.app
http://localhost:3000
```
- Configured in `apps/api/src/index.ts` via Hono `cors()` middleware
- `credentials: true`
- Applied before Clerk middleware (OPTIONS preflight is not rejected)

## Environment Configuration

**Required env vars (API — `apps/api/.env` in dev):**
- `DATABASE_URL` — Neon PostgreSQL connection string
- `CLERK_SECRET_KEY` — Clerk backend secret key
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `CLERK_WEBHOOK_SECRET` — Svix webhook signing secret
- `PORT` — Listen port (default: 8080)

**Required env vars (Web — Vite `VITE_*` prefix):**
- `VITE_API_URL` — Base URL for API (e.g., `http://localhost:8080`)

**Secrets location:** `.env` file at repo root (exists; never read by tooling)

---

*Integration audit: 2026-05-11*
