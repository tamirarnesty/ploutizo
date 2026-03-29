# Phase 1: Foundation & Auth Infrastructure - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Sets up all infrastructure prerequisites before any feature code is written:
- Monorepo packages created and building (`web`, `api`, `ui`, `db`, `validators`, `types`)
- Packages renamed to `@ploutizo/*` namespace
- Drizzle + `postgres.js` database client wired in `apps/api`
- Clerk auth + satellite domain configuration
- `tenantGuard()` middleware with correct order and falsy `orgId` check
- Railway pre-deploy migration and live deployment smoke-tested
- Seed scripts for org creation
- Tailwind v4 audit and fixes on existing `packages/ui` components

</domain>

<decisions>
## Implementation Decisions

### Package Namespace
- **D-01:** Rename all packages to `@ploutizo/*` as part of Phase 1. `@workspace/ui` → `@ploutizo/ui`. All new packages created as `@ploutizo/api` (app), `@ploutizo/db`, `@ploutizo/validators`, `@ploutizo/types`.
- **D-02:** Update `pnpm-workspace.yaml`, all `package.json` files, and import paths in `apps/web` to reflect the new namespace. CLAUDE.md stays as-is (already specifies `@ploutizo/*`).

### Clerk Instance Strategy
- **D-03:** Use the **production Clerk instance from day 1** — configure with production API keys even for local development. No dev instance. This avoids the hard cutover problem (Clerk dev→prod cannot migrate user/org data).
- **D-04:** Local `.env` files use production Clerk API keys. Satellite domain config, `authorizedParties`, and `clockSkewInMs: 10000` all target the production instance.

### Railway Deployment Scope
- **D-05:** Phase 1 ends with a **live Railway deployment and smoke test** — not just local wiring. Verification criteria: `pnpm build` passes in Railway CI, `db:migrate` runs as pre-deploy command, health endpoint (`GET /health`) returns 200, `DATABASE_URL` and `CLERK_SECRET_KEY` are scoped to individual services (not project-level).
- **D-06:** `VITE_DATABASE_URL` and `VITE_CLERK_SECRET_KEY` must not appear in the browser bundle — verified post-deploy.

### Tailwind v4 Audit
- **D-07:** Audit **and fix** all existing shadcn components in `packages/ui` during Phase 1. Do not just document — patch the issues found:
  - Explicit border colors on all components (`border-border` or specific color tokens, not bare `border`)
  - Explicit ring colors (`ring-ring` or specific tokens, not bare `ring`)
  - Shadow and rounded scale names verified/updated for v4

### Claude's Discretion
- Exact Railway service names and project structure on Railway dashboard
- Connection pool size for `postgres.js` (start with default; tune later)
- Health endpoint response body (minimal `{ status: "ok" }` is fine)
- `.env.example` file contents and structure

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project conventions
- `CLAUDE.md` — Package import boundaries, stack choices, naming conventions, coding style, multi-tenancy rules, API conventions, testing rules

### Requirements & planning
- `.planning/REQUIREMENTS.md` — Infrastructure requirements section (Clerk satellite domains, `postgres.js` driver, Tailwind v4 audit notes, `tenantGuard()` falsy check, `clockSkewInMs`)
- `.planning/ROADMAP.md` §Phase 1 — Exact deliverables, plan breakdown, success criteria

### Existing packages to modify
- `packages/ui/package.json` — Current `@workspace/ui` name and dependencies (rename target)
- `apps/web/package.json` — Current web app name and `@workspace/ui` import (update to `@ploutizo/ui`)
- `pnpm-workspace.yaml` — Workspace root (no changes needed, globs still match)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/ui` — shadcn base already scaffolded with Radix UI, cva, tailwind-merge, lucide-react. Rename package name only; keep all existing components and dependencies.
- `apps/web/src/router.tsx` — TanStack Router already configured with `scrollRestoration` and `defaultPreload`. No changes needed in Phase 1.
- `apps/web/src/routes/__root.tsx`, `index.tsx` — Minimal routes exist. Phase 1 does not add user-facing routes.

### Established Patterns
- Tailwind v4 via `@tailwindcss/vite` (already in both `apps/web` and `packages/ui` devDependencies) — correct setup, no migration needed.
- `pnpm-workspace.yaml` uses `apps/*` and `packages/*` globs — new packages are auto-included by path alone, no workspace file changes needed.
- TypeScript strict mode not yet confirmed across all packages — Phase 1 plan must verify and enforce `strict: true` in all `tsconfig.json` files.

### Integration Points
- `apps/api` (to be created) connects to Neon via `postgres.js` — import will be `@ploutizo/db`
- `apps/web` imports UI components from `@ploutizo/ui` (after rename)
- Org creation webhook in `apps/api` calls `seedOrg(orgId)` from `@ploutizo/db`

</code_context>

<specifics>
## Specific Ideas

- `tenantGuard()` checks `!orgId` (falsy), not `orgId === null` — Clerk returns `undefined` when no active org
- `clockSkewInMs: 10000` on `clerkMiddleware()` — handles Railway container clock drift
- Middleware order: `cors()` → `clerkMiddleware()` → `tenantGuard()` — exact order is a CLAUDE.md invariant
- `DATABASE_URL` uses `postgres.js`-compatible direct Neon URL (not PgBouncer pooler, not `neon-http`)
- `db:migrate` wired as Railway pre-deploy command (not `db:push`)
- Seed scripts: `seedOrgCategories(orgId)` + `seedOrgMerchantRules(orgId)` called via `seedOrg(orgId)` wrapper at org creation webhook
- `authorizedParties` set in `clerkMiddleware()` to prevent cross-subdomain cookie leakage

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-auth-infrastructure*
*Context gathered: 2026-03-29*
