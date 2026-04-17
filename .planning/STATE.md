---
gsd_state_version: 1.0
milestone: v0.1
milestone_name: — Foundation
status: completed
last_updated: "2026-04-14T19:17:58.582Z"
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 28
  completed_plans: 28
  percent: 100
---

# Project State

## Current Position

Phase: 03.3.3
Plan: Ready to execute
**Milestone:** v0.2 Transactions & Settlement
**Active Phase:** Phase 03.3.3 — UI Primitive Refactor Sweep — PLANNED (4 plans, 2 waves)
**Status:** Planning complete — ready for execution
**Last session:** 2026-04-17

## Next Action

Execute Phase 03.3.3 (UI primitive refactor sweep)

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation & Auth Infrastructure | complete |
| 2 | Households, Accounts & Classification | complete |
| 02.1 | Code Style & Form Patterns Refactor | complete |
| 02.1.1 | Audit and migrate to neon-serverless per Neon best practices | complete |
| 02.2 | Add light/dark/system theme toggle | complete |
| 02.3 | Vercel skills audit and guidelines | complete |
| 02.4 | App Shell and Sidebar Redesign | complete |
| 02.4.1 | Mobile UI/UX Fixes and Foundation Re-Establishment | complete |
| 03.1 | Transaction Schema & Migrations | complete |
| 03.2 | Transaction API | pending |
| 03.3 | Transaction List UI | pending |
| 03.4 | Transaction Forms UI | pending |
| 04.1 | Settlement API | pending |
| 04.2 | Settlement UI | pending |
| 04.3 | Budgets API | pending |
| 04.4 | Budget Dashboard UI | pending |
| 05.1 | Bank Normalizers | pending |
| 05.2 | Import Batch API | pending |
| 05.3 | Import UI | pending |
| 05.4 | Import Bulk Actions & Duplicate Handling | pending |
| 06.1 | Investment Schema & Contribution Room API | pending |
| 06.2 | Savings Contributions UI | pending |
| 06.3 | Net Worth API | pending |
| 06.4 | Net Worth UI | pending |
| 07.1 | Notifications Table & Write Triggers | pending |
| 07.2 | Notification Feed UI | pending |

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
- Phase 03.2.1 inserted after Phase 03.2: household improvement — settings consolidation + invitation flow (URGENT)
- Phase 03.5 inserted after Phase 03.4: CI testing, linting, and formatting checks (URGENT)
- Phase 03.3.2 inserted after Phase 03.3.1: implement Text typography component in packages/ui (URGENT)
- Phase 03.3.3 inserted after Phase 03.3.2: UI primitive refactor sweep across apps/web (URGENT)

### Pending Todos

| # | Title | Area |
|---|-------|------|
| 1 | Implement <Text> typography component in packages/ui | general |
| 2 | Tag combobox Enter key should create tag without explicit click | ui |
| 3 | Form validation audit — all forms must show correct error messages | ui |
| 4 | Category edit should reflect changes in list without reload | ui |

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
| 260411-r4m | add additional valuable user/member and org attributes from clerk | 2026-04-11 | 38ade1e | [260411-r4m-add-additional-valuable-user-member-and-](./quick/260411-r4m-add-additional-valuable-user-member-and-/) |

## Git Note

Commits blocked: `commit.gpgsign=true` configured but `~/.ssh/id_rsa.pub` does not exist.
All planning files are staged. Run `git commit` once SSH signing is resolved, or:
`git config commit.gpgsign false` to disable signing temporarily.
