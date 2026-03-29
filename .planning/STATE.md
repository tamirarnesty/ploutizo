# Project State

## Current Position

**Milestone:** v0.1 MVP
**Active Phase:** 01 — Foundation & Auth Infrastructure
**Current Plan:** 01-02 (next)
**Status:** IN_PROGRESS
**Last Session:** 2026-03-29 — Completed 01-01-PLAN.md

## Next Action

Execute Plan 01-02 (next plan in Phase 1)

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation & Auth Infrastructure | pending |
| 2 | Households, Accounts & Classification | pending |
| 3 | Transactions | pending |
| 4 | Settlement & Budgets | pending |
| 5 | CSV Import | pending |
| 6 | Savings, Investments & Net Worth | pending |
| 7 | Notifications | pending |

## Initialization Summary

- PROJECT.md created — 2026-03-24
- Config: mode=yolo, granularity=standard, parallel=true, research=true, plan_check=true, verifier=true
- Research complete: stack, features, architecture, pitfalls, SUMMARY.md
- REQUIREMENTS.md created — research-refined with implementation notes
- ROADMAP.md created — 7 phases, 11/11 requirement sections covered

## Key Decisions Logged

- @ploutizo/* namespace adopted for all internal packages (not @workspace/*)
- vitest workspace covers apps/api, packages/db, packages/validators, packages/types
- drizzle-kit added at root level for db migration commands
- Use `postgres.js` direct Neon connection (not `neon-http`, not PgBouncer)
- Clerk satellite domains required for `{subdomain}.ploutizo.app` — must be Phase 1
- `tenantGuard()` checks `!orgId` (falsy), not `orgId === null`
- Budget rollover capped at 1× base limit
- TFSA withdrawals: disclaimer only in v1
- Negative settlement: display as green credit

## Blockers / Open Items

- TFSA 2026 annual limit — verify against CRA before Phase 6
- RRSP 2026 dollar cap — verify against CRA before Phase 6
- Bank CSV real exports — collect before Phase 5 (LOW confidence on column names)
- Neon connection limit on chosen plan — verify before Phase 1 goes live
- ReUI Tailwind v4 compatibility — verify DataGrid/Filters before Phase 3
- Cloudflare proxy for `clerk.ploutizo.app` — must be "DNS only" (grey cloud)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260329-ivf | Update Phase 1 plans to reference old-artifacts schema files | 2026-03-29 | b39a815 | [260329-ivf-analyze-impact-of-old-artifacts-schemas-](./quick/260329-ivf-analyze-impact-of-old-artifacts-schemas-/) |

## Git Note

Commits blocked: `commit.gpgsign=true` configured but `~/.ssh/id_rsa.pub` does not exist.
All planning files are staged. Run `git commit` once SSH signing is resolved, or:
`git config commit.gpgsign false` to disable signing temporarily.
