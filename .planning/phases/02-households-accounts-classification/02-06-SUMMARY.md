---
phase: 02-households-accounts-classification
plan: "06"
subsystem: ui
tags: [shadcn, design-system, dialog, toggle-group, label, popover, button, input, select, checkbox, spinner]

dependency_graph:
  requires:
    - phase: 02-05
      provides: categories/tags pages, Combobox component, icon-picker with HeartPulse/Sparkles/MoreHorizontal
    - phase: 02-04
      provides: account-sheet, accounts-table, merchant-rules, icon-picker, colour-picker, all route files
  provides:
    - packages/ui: Label, Dialog, ToggleGroup/ToggleGroupItem, RadioGroup components installed
    - All raw HTML form elements replaced with shadcn primitives across 7 files
    - CategoryDialog and RuleDialog use shadcn Dialog (not fixed inset-0 overlay)
    - Icon picker uses Popover (not absolute-positioned div)
    - Ownership toggle uses ToggleGroup type="single"
    - Spinner replaces all inline SVG spinners
    - Zero .js extensions in relative imports across 11 files
  affects:
    - future transaction form components (same Button/Input/Label/Select/Dialog patterns)
    - any component adding new form fields (must follow Checkbox+Label sibling pattern)

tech-stack:
  added:
    - "packages/ui/src/components/label.tsx (shadcn Label)"
    - "packages/ui/src/components/dialog.tsx (shadcn Dialog)"
    - "packages/ui/src/components/toggle-group.tsx (shadcn ToggleGroup)"
    - "packages/ui/src/components/toggle.tsx (shadcn Toggle — dependency of toggle-group)"
    - "packages/ui/src/components/radio-group.tsx (shadcn RadioGroup)"
  patterns:
    - "Checkbox + Label sibling pattern (not wrapping label) for all checkbox fields"
    - "Dialog open={true} onOpenChange with parent-gated rendering for modals"
    - "__none__ sentinel string for Radix Select when empty value is invalid"
    - "AlertDialogTrigger asChild wrapping Button component"

key-files:
  created:
    - packages/ui/src/components/label.tsx
    - packages/ui/src/components/dialog.tsx
    - packages/ui/src/components/toggle-group.tsx
    - packages/ui/src/components/toggle.tsx
    - packages/ui/src/components/radio-group.tsx
  modified:
    - apps/web/src/components/accounts/account-sheet.tsx
    - apps/web/src/components/accounts/accounts-table.tsx
    - apps/web/src/components/categories/icon-picker.tsx
    - apps/web/src/routes/_layout.accounts.tsx
    - apps/web/src/routes/_layout.settings/categories.tsx
    - apps/web/src/routes/_layout.settings/merchant-rules.tsx
    - apps/web/src/routes/_layout.settings/household.tsx
    - apps/web/src/routes/__root.tsx
    - apps/web/src/routes/_layout.tsx
    - apps/web/src/hooks/use-accounts.ts
    - apps/web/src/hooks/use-categories.ts
    - apps/web/src/hooks/use-tags.ts
    - apps/web/src/hooks/use-merchant-rules.ts

key-decisions:
  - "Dialog open={true} with parent-gated rendering instead of Dialog open={open} passed as prop — CategoryDialog and RuleDialog are only rendered when dialogCategory/dialogRule is not false, so always-open-when-mounted is correct"
  - "__none__ sentinel for Radix Select categoryId — Radix Select does not reliably support value='' as a selectable item; payload converts back to null before API call"
  - "Checkbox + Label sibling pattern (not wrapping label) — shadcn Checkbox uses Radix primitive which requires sibling label with htmlFor, not a wrapping label element"

requirements-completed:
  - "§2 Accounts"
  - "§3 Categories & Tags"
  - "§9 Merchant Rules"
  - "§1 Households & Users"

duration: 9min
completed: 2026-04-01
---

# Phase 02 Plan 06: UI Code Quality — Replace Raw HTML with shadcn Primitives Summary

**Replaced all raw HTML form elements across 7 component/route files with shadcn Dialog, ToggleGroup, Label, Input, Select, Checkbox, Button, Spinner, and Popover; stripped .js extensions from 11 files; pnpm build passes clean.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-01T20:05:01Z
- **Completed:** 2026-04-01T20:14:15Z
- **Tasks:** 7
- **Files modified:** 16 (5 created, 11 modified — 4 components + 7 route/component files + 5 hook/route files for .js strip)

## Accomplishments

- Installed 4 missing components into packages/ui: Label, Dialog, ToggleGroup/ToggleGroupItem, RadioGroup (plus toggle.tsx dependency)
- Stripped .js extensions from relative imports across all 11 affected files
- Replaced every raw `<button>`, `<input>`, `<label>`, `<select>` in 7 files — zero exceptions except colour-picker.tsx (untouched by design)
- CategoryDialog and RuleDialog both converted from fixed inset-0 overlay pattern to shadcn Dialog — proper focus trap, keyboard navigation, and backdrop
- Icon picker converted from absolute-positioned div to Popover — proper portal rendering, auto-close on outside click
- Ownership toggle in AccountSheet uses ToggleGroup type="single" — uniform visual treatment with other toggle groups in future
- Both inline SVG spinners replaced with Spinner component — consistent loading state across app

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Label, Dialog, ToggleGroup, RadioGroup into packages/ui** - `3be1cb5` (chore)
2. **Task 2: Strip .js extensions from 11 files** - `9f3a48f` (chore)
3. **Task 3: Replace raw HTML in account-sheet.tsx, accounts-table.tsx, _layout.accounts.tsx** - `0731c45` (feat)
4. **Task 4: Replace raw HTML in icon-picker.tsx with Popover + Button + Input** - `079a5ed` (feat)
5. **Task 5: Replace raw HTML in categories.tsx — Dialog + Label + Button** - `f467a7d` (feat)
6. **Task 6: Replace raw HTML in merchant-rules.tsx — Dialog + Label + Input + Select + Button** - `033e5cf` (feat)
7. **Task 7: Replace raw HTML in household.tsx + build verification** - `0cfd18f` (feat)

## Files Created/Modified

**Created (packages/ui):**
- `packages/ui/src/components/label.tsx` - shadcn Label component
- `packages/ui/src/components/dialog.tsx` - shadcn Dialog with DialogContent/Header/Title/Footer/Close
- `packages/ui/src/components/toggle-group.tsx` - shadcn ToggleGroup/ToggleGroupItem
- `packages/ui/src/components/toggle.tsx` - shadcn Toggle (dependency of toggle-group)
- `packages/ui/src/components/radio-group.tsx` - shadcn RadioGroup/RadioGroupItem

**Modified (apps/web):**
- `apps/web/src/components/accounts/account-sheet.tsx` - ToggleGroup ownership, Label+Input fields, Select type, Checkbox co-owners, Spinner, Button
- `apps/web/src/components/accounts/accounts-table.tsx` - Button for empty state
- `apps/web/src/components/categories/icon-picker.tsx` - Popover replaces absolute div; Button+Input inside PopoverContent
- `apps/web/src/routes/_layout.accounts.tsx` - Button for Add account header
- `apps/web/src/routes/_layout.settings/categories.tsx` - Dialog for CategoryDialog; Label+Input+Button throughout
- `apps/web/src/routes/_layout.settings/merchant-rules.tsx` - Dialog for RuleDialog; Label+Input+Select+Button; __none__ sentinel
- `apps/web/src/routes/_layout.settings/household.tsx` - Label+Input+Button+Spinner; no more inline SVG
- All 11 files in routes/hooks/components had .js stripped from relative imports

## Decisions Made

- **Dialog open={true} with parent-gated rendering**: CategoryDialog and RuleDialog are only rendered when `dialogCategory !== false` / `dialogRule !== false`. Since they are mounted/unmounted by the parent, using `open={true}` is equivalent to controlled open state but simpler — no prop threading needed.
- **`__none__` sentinel**: Radix Select doesn't reliably support `value=""` as a selectable option. Using `"__none__"` as a sentinel for "no category selected" keeps the component controlled. The payload conversion `categoryId === '__none__' ? null : categoryId` keeps the API surface clean.
- **Checkbox + Label sibling pattern**: shadcn Checkbox is a Radix primitive that renders a `<button>` element, not a native `<input type="checkbox">`. It must be associated with a Label via `htmlFor` + `id`, not by wrapping.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- The plan specified `pnpm build --filter @ploutizo/web` but the web package name is `"web"` not `"@ploutizo/web"`. Used `pnpm build --filter web` instead. Build passed cleanly.

## Known Stubs

None — all components are wired to real data. Input `placeholder` attributes are not stubs; they are UI copy.

## Self-Check

- [x] `packages/ui/src/components/label.tsx` exists
- [x] `packages/ui/src/components/dialog.tsx` exists
- [x] `packages/ui/src/components/toggle-group.tsx` exists
- [x] `packages/ui/src/components/radio-group.tsx` exists
- [x] Zero raw `<button>/<input>/<label>/<select>` in 7 affected files (verified with grep)
- [x] Zero `.js` relative imports in 11 files (verified with grep)
- [x] `fixed inset-0` pattern gone from categories.tsx and merchant-rules.tsx
- [x] PopoverContent/PopoverTrigger in icon-picker.tsx (4 occurrences)
- [x] ToggleGroup in account-sheet.tsx (3 occurrences)
- [x] Spinner in account-sheet.tsx and household.tsx
- [x] `__none__` sentinel in merchant-rules.tsx (3 occurrences)
- [x] `aria-invalid` on pattern Input in merchant-rules.tsx
- [x] Commits 3be1cb5, 9f3a48f, 0731c45, 079a5ed, f467a7d, 033e5cf, 0cfd18f exist in git log
- [x] `pnpm build --filter web` exits 0 (verified)

## Self-Check: PASSED

## Next Phase Readiness

- All phase 02 components now use the design system consistently
- Phase 03 (Transactions) can build transaction forms using the same patterns: Dialog, Label+Input, Select, Checkbox+Label sibling, Button
- The `__none__` sentinel pattern is established for optional Select fields — apply consistently in transaction forms

---
*Phase: 02-households-accounts-classification*
*Completed: 2026-04-01*
