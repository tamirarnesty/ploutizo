---
status: fixing
trigger: "Find all kebab-cased source files under apps/web/src/ and packages/ that have been superseded by PascalCase or camelCase equivalents"
created: 2026-04-02T00:00:00Z
updated: 2026-04-02T00:00:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: CONFIRMED — Phase 02.1 refactor created PascalCase/camelCase replacements but did not delete the original kebab-case files
test: Evidence gathered — all 6 pairs confirmed as duplicates; 3 have stale imports that need updating first
expecting: Fix imports in 2 files, then delete all 6 kebab-case originals
next_action: Update imports in _layout.tsx and categories.tsx, then delete 6 kebab files

## Symptoms

expected: Only one canonical file per component/hook — named in PascalCase (components) or camelCase (hooks/utils)
actual: Both account-sheet.tsx (kebab) and AccountSheet.tsx (PascalCase) exist for the same thing. Likely more such pairs exist.
errors: No runtime errors — this is a dead-file / naming-convention cleanup audit
reproduction: ls apps/web/src/components/ shows mixed naming
started: Migration from kebab-case to PascalCase/camelCase happened during phase 02.1 refactor; old files were not deleted

## Eliminated

## Evidence

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/components/accounts/
  found: Both account-sheet.tsx and AccountSheet.tsx exist; both accounts-table.tsx and AccountsTable.tsx exist
  implication: Two confirmed duplicate pairs; no imports of either kebab file found anywhere

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/components/ (root)
  found: Both app-sidebar.tsx and AppSidebar.tsx exist; _layout.tsx imports AppSidebar from "../components/app-sidebar" (kebab path)
  implication: Import path must be updated to AppSidebar.tsx before kebab can be deleted

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/components/categories/
  found: colour-picker.tsx/ColourPicker.tsx pair and icon-picker.tsx/LucideIconPicker.tsx pair; categories.tsx imports both from kebab paths
  implication: Two import lines in categories.tsx must be updated before kebab files can be deleted

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/lib/
  found: Both format-currency.ts and formatCurrency.ts exist; no imports of format-currency (kebab) found anywhere
  implication: Safe to delete directly

- timestamp: 2026-04-02T00:00:00Z
  checked: packages/ui/src/components/ and packages/ui/src/hooks/
  found: All kebab files are uniform shadcn/ui naming convention with no PascalCase counterparts
  implication: Not duplicates — these are intentionally kebab-cased and must NOT be deleted

## Resolution

root_cause: Phase 02.1 refactor created PascalCase/camelCase canonical files (AccountSheet.tsx, AccountsTable.tsx, AppSidebar.tsx, ColourPicker.tsx, LucideIconPicker.tsx, formatCurrency.ts) but never deleted the original kebab-case originals. Three of those originals (app-sidebar, colour-picker, icon-picker) were still actively imported by stale import paths.
fix: Updated import path in _layout.tsx (app-sidebar -> AppSidebar), updated two import paths in categories.tsx (icon-picker -> LucideIconPicker, colour-picker -> ColourPicker). Deleted all 6 kebab-case originals.
verification: grep for all 6 kebab names returns no matches across apps/web/src and packages/. TypeScript check shows zero new errors introduced (pre-existing errors are unrelated to this change). Canonical files confirmed present in their directories.
files_changed:
  - apps/web/src/routes/_layout.tsx (import path update)
  - apps/web/src/routes/_layout.settings/categories.tsx (two import path updates)
  - apps/web/src/components/accounts/account-sheet.tsx (deleted)
  - apps/web/src/components/accounts/accounts-table.tsx (deleted)
  - apps/web/src/components/app-sidebar.tsx (deleted)
  - apps/web/src/components/categories/colour-picker.tsx (deleted)
  - apps/web/src/components/categories/icon-picker.tsx (deleted)
  - apps/web/src/lib/format-currency.ts (deleted)
