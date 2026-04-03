---
phase: 02-households-accounts-classification
plan: "05"
subsystem: api-and-ui
tags: [webhook, seed, orgs, combobox, icon-picker, classification, categories, tags]

dependency_graph:
  requires:
    - phase: 02-04
      provides: categories/tags pages, icon-picker, ICON_MAP, plain tag input
  provides:
    - Fixed organization.created webhook that inserts orgs row before seeding
    - ReUI Combobox component (packages/ui/src/components/reui/combobox.tsx)
    - Tags section using Combobox with search + inline-create
    - HeartPulse, Sparkles, MoreHorizontal icons in ICON_MAP
  affects:
    - future webhook event handling
    - future tag selection flows in transactions

tech-stack:
  added:
    - "packages/ui/src/components/reui/combobox.tsx (Popover-based Combobox built manually)"
  patterns:
    - "onConflictDoNothing() for idempotent webhook event handlers"
    - "__create__ prefix convention for inline-create Combobox values"
    - "Combobox built on top of existing Popover primitives when registry component unavailable"

key-files:
  created:
    - packages/ui/src/components/reui/combobox.tsx
  modified:
    - apps/api/src/routes/webhooks.ts
    - apps/web/src/components/categories/icon-picker.tsx
    - apps/web/src/routes/_layout.settings/categories.tsx

key-decisions:
  - "ReUI registry does not have a combobox component for radix-nova style — built manually using existing Popover primitives rather than switching to a different component library"
  - "onConflictDoNothing() used on orgs insert to make webhook replay-safe"
  - "tagInputValue state remains external to Combobox (controlled) so the trigger label updates as user types"

requirements-completed:
  - "§1 Households & Users"
  - "§3 Categories & Tags"

duration: 6min
completed: 2026-04-01
---

# Phase 02 Plan 05: Gap Closure — Orgs FK Fix + Tag Combobox + Missing Icons Summary

**Fixed orgs FK violation in organization.created webhook, replaced plain tag input with a Popover-based Combobox with search + inline-create, and added 3 missing icons (HeartPulse, Sparkles, MoreHorizontal) to the icon picker.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-01T15:54:54Z
- **Completed:** 2026-04-01T16:00:56Z
- **Tasks:** 2
- **Files modified:** 4 (+ 1 created)

## Accomplishments

- Fixed FK violation: `organization.created` now inserts `orgs` row with `onConflictDoNothing()` before calling `seedOrg()`, ensuring default categories and merchant rules seed correctly
- Replaced plain `<input>` + "Add tag" button with a Combobox that filters existing tags and shows "Create X" when the input doesn't match any existing tag
- Added HeartPulse, Sparkles, and MoreHorizontal to the icon-picker import and ICON_MAP — Healthcare, Personal Care, and Other categories now render icons correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix webhook — insert orgs row before seedOrg()** - `3562efd` (fix)
2. **Task 2: Add missing icons + install Combobox + replace tag input** - `728b25c` (feat)

## Files Created/Modified

- `apps/api/src/routes/webhooks.ts` - Added `db` and `orgs` imports; inserted orgs row before `seedOrg()`
- `apps/web/src/components/categories/icon-picker.tsx` - Added HeartPulse, Sparkles, MoreHorizontal to import and ICON_MAP
- `apps/web/src/routes/_layout.settings/categories.tsx` - Replaced plain tag input+button with Combobox (D-20 requirement)
- `packages/ui/src/components/reui/combobox.tsx` - New file: Popover-based Combobox with Trigger, Content, Input, List, Item, Empty

## Decisions Made

- **ReUI combobox unavailable in registry**: `https://reui.io/r/radix-nova/combobox.json` returns HTML (no JSON component) — the radix-nova style doesn't have a combobox entry. Built `combobox.tsx` manually using the existing `Popover` primitives from `radix-ui`. The exported API (`Combobox`, `ComboboxTrigger`, `ComboboxContent`, `ComboboxInput`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty`) matches the plan spec exactly.
- **Controlled `tagInputValue` state**: Kept outside Combobox root so the trigger label reflects typed text. When a selection is made the Combobox closes and the `__create__` prefix is stripped to extract the tag name.
- **idempotent insert**: Used `.onConflictDoNothing()` on the orgs insert so webhook replay (Svix retry on timeout) is safe.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ReUI registry does not have combobox for radix-nova style**
- **Found during:** Task 2 (Step 1 — Install ReUI Combobox)
- **Issue:** `pnpm dlx shadcn@latest add @reui/combobox` returned "The item at https://reui.io/r/radix-nova/combobox.json was not found." The registry only has the sortable, badge, and data-grid components for this style.
- **Fix:** Built `packages/ui/src/components/reui/combobox.tsx` manually using the existing `radix-ui` Popover primitives, implementing the same export surface the plan specified.
- **Files modified:** packages/ui/src/components/reui/combobox.tsx (created)
- **Verification:** Web build exits 0; `grep "Combobox" apps/web/src/routes/_layout.settings/categories.tsx` returns 22 matches
- **Committed in:** 728b25c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing registry component)
**Impact on plan:** Required building the component manually, but same API surface delivered. No scope creep.

## Issues Encountered

None beyond the registry deviation above.

## Known Stubs

None — all code paths are wired. Combobox tag creation calls `createTag.mutate()` with the real API hook. Icon picks render via real `ICON_MAP` lookups. Webhook inserts real DB row.

## Self-Check

- [x] `apps/api/src/routes/webhooks.ts` — contains `db.insert(orgs)` at line 33, before `seedOrg` at line 34
- [x] `apps/web/src/components/categories/icon-picker.tsx` — HeartPulse/Sparkles/MoreHorizontal present in both import (line 9) and ICON_MAP (line 20)
- [x] `packages/ui/src/components/reui/combobox.tsx` — exists on disk
- [x] `apps/web/src/routes/_layout.settings/categories.tsx` — 22 Combobox occurrences, `__create__` pattern present (lines 251–252, 287)
- [x] No wildcard `import *` in icon-picker.tsx
- [x] Commits 3562efd and 728b25c exist in git log
- [x] `pnpm test --filter api -- --run` exits 0 (26/26 tests pass)
- [x] `pnpm build --filter web` exits 0

## Self-Check: PASSED

## Next Phase Readiness

- Phase 02 gap closure complete — all BLOCKER/GAP/WARNING items from VERIFICATION.md addressed
- Phase 03 (Transactions) is unblocked — org creation now correctly seeds default categories and merchant rules, which transactions reference

---
*Phase: 02-households-accounts-classification*
*Completed: 2026-04-01*
