---
gsd_state_version: 1.0
milestone: v0.1
milestone_name: MVP
status: planning
last_updated: "2026-04-04T02:40:24.406Z"
progress:
  total_phases: 27
  completed_phases: 5
  total_plans: 22
  completed_plans: 18
---

# Project State

## Current Position

Phase: 02.3
Plan: Not started
**Milestone:** v0.1 MVP
**Active Phase:** Phase 02.1.1 — Audit and Migrate to Neon Serverless — COMPLETE
**Status:** Ready to plan
**Last session:** 2026-04-04T02:40:24.401Z

## Next Action

Begin Phase 02.2 (light/dark/system theme toggle)

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation & Auth Infrastructure | complete |
| 2 | Households, Accounts & Classification | complete |
| 02.1 | Code Style & Form Patterns Refactor | complete |
| 02.1.1 | Audit and migrate to neon-serverless per Neon best practices | complete |
| 02.2 | Add light/dark/system theme toggle | pending |
| 02.3 | Vercel skills audit and guidelines | pending |
| 3.1 | Transaction Schema & Migrations | pending |
| 3.2 | Transaction API | pending |
| 3.3 | Transaction List UI | pending |
| 3.4 | Transaction Forms UI | pending |
| 4.1 | Settlement API | pending |
| 4.2 | Settlement UI | pending |
| 4.3 | Budgets API | pending |
| 4.4 | Budget Dashboard UI | pending |
| 5.1 | Bank Normalizers | pending |
| 5.2 | Import Batch API | pending |
| 5.3 | Import UI | pending |
| 5.4 | Import Bulk Actions & Duplicate Handling | pending |
| 6.1 | Investment Schema & Contribution Room API | pending |
| 6.2 | Savings Contributions UI | pending |
| 6.3 | Net Worth API | pending |
| 6.4 | Net Worth UI | pending |
| 7.1 | Notifications Table & Write Triggers | pending |
| 7.2 | Notification Feed UI | pending |

## Initialization Summary

- PROJECT.md created — 2026-03-24
- Config: mode=yolo, granularity=standard, parallel=true, research=true, plan_check=true, verifier=true
- Research complete: stack, features, architecture, pitfalls, SUMMARY.md
- REQUIREMENTS.md created — research-refined with implementation notes
- ROADMAP.md created — 7 phases, 11/11 requirement sections covered

## Key Decisions Logged

- packages/db uses @neondatabase/serverless WebSocket Pool (not postgres.js) — neonConfig.webSocketConstructor set before Pool construction for scale-to-zero (02.1.1-01)
- Pool constructor vi.fn mock requires regular function (not arrow fn) — arrow functions are not constructable in JS (02.1.1-01)
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
- packages/ui exports map uses glob ./components/* — no manual package.json entries needed for form.tsx or field.tsx — 02.1-01
- createFormHookContexts + createFormHook composition pattern used for project-wide useAppForm; shadcn tanstack-form block not in radix-nova registry so form.tsx is hand-written — 02.1-01

## Accumulated Context

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Code Style & Form Patterns Refactor (URGENT)
- Phase 02.1.1 inserted after Phase 02.1: Audit and migrate to neon-serverless per Neon best practices (URGENT)
- Phase 02.2 inserted after Phase 2: add light/dark/system theme toggle with default 'system' theme being set (URGENT)
- Phase 02.3 inserted after Phase 02: vercel skills audit and guidelines (URGENT)
- Phase 02.4 inserted after Phase 02: app shell and sidebar redesign (URGENT)

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
