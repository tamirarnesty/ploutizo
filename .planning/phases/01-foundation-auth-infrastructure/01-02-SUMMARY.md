---
phase: 01-foundation-auth-infrastructure
plan: 02
subsystem: database
tags: [drizzle-orm, postgres.js, neon, schema, enums]
dependency_graph:
  requires: [01-01]
  provides: [db-client, schema-enums, drizzle-config]
  affects: [01-06, 02-01]
tech_stack:
  added: [drizzle-orm@0.45.2, postgres@3.4.8, drizzle-kit@0.31.10, vitest@4.1.2]
  patterns: [module-scope postgres.js init, pgEnum stubs, drizzle config at root]
key_files:
  created:
    - packages/db/package.json
    - packages/db/tsconfig.json
    - packages/db/src/client.ts
    - packages/db/src/schema/enums.ts
    - packages/db/src/schema/index.ts
    - packages/db/src/index.ts
    - packages/db/vitest.config.ts
    - packages/db/src/__tests__/client.test.ts
    - drizzle.config.ts
  modified:
    - pnpm-lock.yaml
decisions:
  - postgres.js initialized at module scope with max:10 pool — not per-request
  - DATABASE_URL used directly without VITE_ prefix — api-only access
  - All 11 enums copied verbatim from old-artifacts now (no DB tables yet)
  - Hard package boundary: @ploutizo/db imported by apps/api only
metrics:
  duration_seconds: 171
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_created: 9
  files_modified: 1
---

# Phase 01 Plan 02: @ploutizo/db Package and Drizzle Client Summary

postgres.js + Drizzle ORM client initialized at module scope in `@ploutizo/db`, backed by Neon Postgres with `drizzle.config.ts` at repo root and all 11 shared pgEnum stubs from old-artifacts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create @ploutizo/db package with postgres.js Drizzle client | e1a01ac | packages/db/{package.json,tsconfig.json,src/client.ts,src/schema/enums.ts,src/schema/index.ts,src/index.ts} |
| 2 | Wire drizzle.config.ts and create DB client unit test | 9f1035e, aa99f45 | drizzle.config.ts, packages/db/vitest.config.ts, packages/db/src/__tests__/client.test.ts |

## Decisions Made

- `postgres.js` initialized at module scope (`const client = postgres(...)`) — single connection pool per process, not per-request
- Direct Neon URL used (not PgBouncer pooler) — postgres.js manages its own pooling
- `DATABASE_URL` without `VITE_` prefix — the db package is api-side only
- All 11 shared enums copied verbatim from `old-artifacts/enums.ts` at this phase — even those needed only by Phase 2+ schemas. Enums create no DB tables so there's no harm, and having them here prevents import issues when tables are added later
- `@ploutizo/db` exports boundary: `apps/web` must never import this package

## Verification Results

- `pnpm typecheck --filter @ploutizo/db` exits 0
- `pnpm test --filter @ploutizo/db` exits 0 — 2/2 tests passing
- `packages/db/src/client.ts` contains `postgres(process.env.DATABASE_URL!` — no VITE_ prefix
- `drizzle.config.ts` points to `./packages/db/src/schema/index.ts` — no VITE_ prefix

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript cast error in client.test.ts**
- **Found during:** Task 2 typecheck
- **Issue:** `as ReturnType<typeof vi.fn>` cast from `typeof postgres` caused TS2352 — types don't sufficiently overlap
- **Fix:** Added `unknown` intermediate cast: `as unknown as ReturnType<typeof vi.fn>`
- **Files modified:** packages/db/src/__tests__/client.test.ts
- **Commit:** aa99f45

## Known Stubs

- `packages/db/src/schema/index.ts` only exports enums — no tables yet. This is intentional; tables are added in Phase 2+.
- `packages/db/src/index.ts` exports `db` and all schema enums — no table types wired yet.

These stubs are correct for this plan's scope. Phase 2 plans will add table schemas.

## Self-Check: PASSED

Files created:
- packages/db/package.json: FOUND
- packages/db/tsconfig.json: FOUND
- packages/db/src/client.ts: FOUND
- packages/db/src/schema/enums.ts: FOUND
- packages/db/src/schema/index.ts: FOUND
- packages/db/src/index.ts: FOUND
- packages/db/vitest.config.ts: FOUND
- packages/db/src/__tests__/client.test.ts: FOUND
- drizzle.config.ts: FOUND

Commits:
- e1a01ac: FOUND
- 9f1035e: FOUND
- aa99f45: FOUND
