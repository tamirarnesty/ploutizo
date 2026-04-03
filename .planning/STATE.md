---
gsd_state_version: 1.0
milestone: v0.1
milestone_name: MVP
status: executing
last_updated: "2026-04-02T22:04:11.453Z"
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 12
  completed_plans: 12
---

# Project State

## Current Position

Phase: 02 (households-accounts-classification) — EXECUTING
Plan: 3 of 6
**Milestone:** v0.1 MVP
**Active Phase:** Phase 02 — Households, Accounts & Classification — COMPLETE
**Status:** Ready to execute
**Last session:** 2026-04-02T22:04:11.450Z

## Next Action

Begin Phase 03 (Transactions)

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

- Use `postgres.js` direct Neon connection (not `neon-http`, not PgBouncer)
- Clerk satellite domains required for `{subdomain}.ploutizo.app` — must be Phase 1
- `tenantGuard()` checks `!orgId` (falsy), not `orgId === null`
- Budget rollover capped at 1× base limit
- TFSA withdrawals: disclaimer only in v1
- Negative settlement: display as green credit
- `authorizedParties` in `@hono/clerk-auth` is `string[]` only — function type not supported; `isAllowedParty` exported as utility, static array used for `clerkMiddleware` (01-03)
- Seed data uses schema field names: `pattern` and `renameTo` (not plan aliases `matchValue`/`renameDescription`) — 01-05
- Test mocks for Drizzle insert use `unknown` intermediate cast to satisfy `PgInsertBuilder` strict types — 01-05
- HouseholdSettings type defined inline in household.tsx until @ploutizo/types is populated by plan 02-01 — 02-02
- shadcn Sidebar installed at packages/ui level (not apps/web) so all apps share the same component — 02-02
- ReUI DataGrid requires vite resolve.alias for @ploutizo/components + ui/ re-export stubs; plain string headers avoid DataGridColumnHeader import issues — 02-03
- @ploutizo/types path mapping must be added to apps/web/tsconfig.json for web app to import shared types — 02-03
- ReUI combobox not in radix-nova registry — built manually from Popover primitives; exports same API surface as plan specified — 02-05
- onConflictDoNothing() used on orgs insert in webhook handler so Svix retries are safe — 02-05
- Dialog open={true} with parent-gated rendering for CategoryDialog/RuleDialog — simpler than prop threading, correct because parent mounts/unmounts conditionally — 02-06
- __none__ sentinel for optional Radix Select fields (categoryId) — Radix Select doesn't support value="" reliably; payload converts back to null before API call — 02-06
- Checkbox + Label sibling pattern (not wrapping label) — shadcn Checkbox is a Radix button primitive, must use htmlFor+id association — 02-06

## Accumulated Context

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Code Style & Form Patterns Refactor (URGENT)

## Blockers / Open Items

- TFSA 2026 annual limit — verify against CRA before Phase 6
- RRSP 2026 dollar cap — verify against CRA before Phase 6
- Bank CSV real exports — collect before Phase 5 (LOW confidence on column names)
- Neon connection limit on chosen plan — verify before Phase 1 goes live
- reorderSchema uses z.string().uuid() — test orderedIds must be valid UUIDs (non-UUID strings correctly rejected) — 02-04
- ReUI Sortable component uses strategy='vertical' prop (not layout prop) — confirm before using in future plans — 02-04
- ReUI Tailwind v4 compatibility — DataGrid confirmed working in 02-03; Filters not yet tested
- Cloudflare proxy for `clerk.ploutizo.app` — must be "DNS only" (grey cloud)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260329-ivf | Update Phase 1 plans to reference old-artifacts schema files | 2026-03-29 | b39a815 | [260329-ivf-analyze-impact-of-old-artifacts-schemas-](./quick/260329-ivf-analyze-impact-of-old-artifacts-schemas-/) |

## Git Note

Commits blocked: `commit.gpgsign=true` configured but `~/.ssh/id_rsa.pub` does not exist.
All planning files are staged. Run `git commit` once SSH signing is resolved, or:
`git config commit.gpgsign false` to disable signing temporarily.
