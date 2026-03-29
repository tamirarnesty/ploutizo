# Phase 1: Foundation & Auth Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 01-foundation-auth-infrastructure
**Areas discussed:** Package namespace, Clerk instance strategy, Railway deployment scope, Tailwind v4 audit scope

---

## Package Namespace

| Option | Description | Selected |
|--------|-------------|----------|
| Rename now to @ploutizo/* | Rename @workspace/ui → @ploutizo/ui now. All new packages as @ploutizo/*. Consistent with CLAUDE.md from the start. | ✓ |
| Keep @workspace/* for existing, @ploutizo/* for new | Leave @workspace/ui as-is, create new packages as @ploutizo/*. Inconsistency would need cleanup later. | |
| Keep @workspace/* for everything | Create all packages as @workspace/*. CLAUDE.md import rules still apply with @workspace namespace. Rename deferred. | |

**User's choice:** Rename to @ploutizo/* now
**Notes:** User confirmed after asking for clarification on the trade-offs. Decision: rename `@workspace/ui` → `@ploutizo/ui` and create all new packages (`api`, `db`, `validators`, `types`) as `@ploutizo/*`. CLAUDE.md stays as-is (already specifies this namespace).

---

## Clerk Instance Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Production instance from day 1 | Configure with Clerk production API keys from the start. No cutover risk. | ✓ |
| Dev instance first, migrate manually later | Use Clerk dev instance during Phase 1. Accept that test users/orgs will be lost on cutover. | |

**User's choice:** Production instance from day 1
**Notes:** REQUIREMENTS.md warns that Clerk dev→prod is a hard cutover with no data migration path. Using production keys locally avoids this entirely.

---

## Railway Deployment Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Live deploy + smoke test | Phase 1 ends with actual Railway deployment. Verify build, db:migrate, health endpoint, env var isolation. | ✓ |
| Wired locally, deploy in Phase 2 | Configure railway.toml and env vars, but live deployment happens at start of Phase 2. | |

**User's choice:** Live deploy + smoke test
**Notes:** Phase 1 is only truly done when it runs on Railway. Smoke test: `pnpm build` passes, `db:migrate` runs as pre-deploy, `GET /health` returns 200, secrets scoped to services not project.

---

## Tailwind v4 Audit Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Document + fix in Phase 1 | Audit packages/ui shadcn components and immediately fix v4 issues found. | ✓ |
| Document only, fix as we go | Produce findings doc. Individual phases fix components as they add/modify them. | |

**User's choice:** Document + fix in Phase 1
**Notes:** Cleaner to fix at the foundation before feature phases start adding more components. v4 issues: border defaults, ring size, shadow/rounded scale names.

---

## Claude's Discretion

- Railway service names and dashboard project structure
- `postgres.js` connection pool size (default to start)
- Health endpoint response body
- `.env.example` contents and structure

## Deferred Ideas

None — discussion stayed within phase scope.
