---
phase: quick-260329-ivf
plan: 01
subsystem: planning
tags: [schema, old-artifacts, drizzle, planning-corrections]
dependency_graph:
  requires: []
  provides:
    - "01-02-PLAN.md Task 1 instructs verbatim copy of old-artifacts/enums.ts (all 11 enums)"
    - "01-05-PLAN.md Task 1 instructs verbatim copy of old-artifacts/auth.ts and old-artifacts/classification.ts"
  affects:
    - ".planning/phases/01-foundation-auth-infrastructure/01-02-PLAN.md"
    - ".planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md"
tech_stack:
  added: []
  patterns:
    - "verbatim copy from old-artifacts to prevent schema drift"
key_files:
  modified:
    - ".planning/phases/01-foundation-auth-infrastructure/01-02-PLAN.md"
    - ".planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md"
decisions:
  - "Enums file copied in full (all 11 enums) even if only 2 were originally stubbed — enums create no DB tables, so there is no migration cost to including unused enums early"
  - "Task 2 seed field inconsistencies (matchValue vs pattern, renameDescription vs renameTo) are intentionally left unaddressed — out of scope for this quick task"
metrics:
  duration: "106 seconds"
  completed: "2026-03-29"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 260329-ivf: Analyze Impact of Old-Artifacts Schemas — Summary

One-liner: Updated two Phase 1 PLAN.md files so schema-creation tasks copy old-artifacts Drizzle definitions verbatim instead of deriving stubs from scratch.

## Objective

Prevent schema drift by directing Phase 1 executors to use `old-artifacts/` as the authoritative source for enum and table definitions, rather than recreating them manually.

## Tasks Completed

### Task 1 — Update 01-02-PLAN.md Task 1: enums verbatim copy

**Commit:** `9716222`
**File:** `.planning/phases/01-foundation-auth-infrastructure/01-02-PLAN.md`

Changes made to Task 1 ("Create @ploutizo/db package with postgres.js Drizzle client"):

1. Added `old-artifacts/enums.ts (source of truth — copy verbatim)` to `<read_first>` block.
2. Replaced the 2-enum stub block with a verbatim copy instruction covering all 11 enums: `memberRoleEnum`, `transactionTypeEnum`, `incomeTypeEnum`, `accountTypeEnum`, `recurringFrequencyEnum`, `recurringStatusEnum`, `merchantMatchTypeEnum`, `budgetPeriodTypeEnum`, `investmentTypeEnum`, `notificationTypeEnum`, `invitationStatusEnum`.
3. Updated `<acceptance_criteria>` to verify all 11 enum names by name and require content to match `old-artifacts/enums.ts`.

### Task 2 — Update 01-05-PLAN.md Task 1: auth + classification verbatim copy

**Commit:** `e8fe27c`
**File:** `.planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md`

Changes made to Task 1 ("Create schema stubs for categories and merchant rules"):

1. Added `old-artifacts/auth.ts` and `old-artifacts/classification.ts` (both with verbatim copy note) to `<read_first>` block.
2. Replaced the full `<action>` body with verbatim copy instructions for both files, including:
   - Key invariants encoded in each file (externalId not clerkId; non-nullable orgId; merchantMatchTypeEnum not plain text; pattern/renameTo not matchValue/renameDescription)
   - ESM `.js` import path fix required for both files
   - Phase-scoped `index.ts` instruction (NOT old-artifacts/index.ts which has deferred tables)
3. Replaced `<acceptance_criteria>` to verify: auth.ts exports users/orgs/orgMembers/invitations; classification.ts exports categories/tags/merchantRules/merchantRuleTags; merchantMatchTypeEnum used for matchType; orgId is notNull on all three tables; verbatim match for both files.
4. Updated `<done>` criteria to reflect verbatim copy expectations.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this quick task modified planning documents only, no application code.

## Self-Check: PASSED

- `.planning/phases/01-foundation-auth-infrastructure/01-02-PLAN.md` — modified, exists
- `.planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md` — modified, exists
- Commit `9716222` — verified present
- Commit `e8fe27c` — verified present
- `grep "old-artifacts/enums.ts" 01-02-PLAN.md` — 4 matches (read_first, action x2, acceptance_criteria)
- `grep "old-artifacts/auth.ts" 01-05-PLAN.md` — 6 matches
- `grep "merchantMatchTypeEnum" 01-05-PLAN.md` — 2 matches
- `grep "merchantRuleTags" 01-05-PLAN.md` — 3 matches
