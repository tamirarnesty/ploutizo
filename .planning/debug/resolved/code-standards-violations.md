---
status: awaiting_human_verify
trigger: "code-standards-violations"
created: 2026-04-02T00:00:00Z
updated: 2026-04-02T00:00:00Z
---

## Current Focus

hypothesis: All violations fixed — new files created, old route files stripped to shells, function exports converted to const, relative imports updated to @/
test: pnpm --filter web typecheck — passed with zero new errors (only pre-existing errors in packages/ui and sign-in/sign-up routes)
expecting: Human confirms no regressions and standards are met
next_action: Await human verification

## Symptoms

expected: All code follows the standards in `.planning/STANDARDS.md` — correct file naming, data-access hooks in `lib/data-access/`, route files are shells only, `const` arrow functions, one component per file, `@/` path alias, proper hook naming conventions.
actual: Current code violates multiple standards — hooks are in `apps/web/src/hooks/` instead of `lib/data-access/`, route files contain component logic instead of being shells, files may use `function` keyword, import paths may use `../` instead of `@/`, hooks may be named `useAccounts` instead of `useGetAccounts`.
errors: No runtime errors — this is a code quality/standards compliance issue.
reproduction: Read any file in `apps/web/src/hooks/`, `apps/web/src/routes/`, or `apps/web/src/components/` and compare against `.planning/STANDARDS.md`.
timeline: Standards were recently defined; existing code predates them.

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/hooks/use-accounts.ts
  found: |
    - Wrong directory: should be lib/data-access/
    - Wrong file name: should be PascalCase hook names e.g. useGetAccounts.ts
    - useAccounts → should be useGetAccounts
    - useAccountMembers → should be useGetAccountMembers
    - useOrgMembers → should be useGetOrgMembers
    - Import uses `../lib/queryClient` (relative, not @/)
    - All hooks are in one file — should be split by operation
  implication: Needs to be split into separate files per operation under lib/data-access/

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/hooks/use-categories.ts
  found: |
    - Wrong directory + file name
    - useCategories → useGetCategories
    - Exports Category interface (acceptable per standards if tightly coupled)
    - Import uses `../lib/queryClient`
  implication: Split into per-operation files under lib/data-access/

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/hooks/use-merchant-rules.ts
  found: |
    - Wrong directory + file name
    - useMerchantRules → useGetMerchantRules
    - Exports MerchantRule interface
    - Import uses `../lib/queryClient`
  implication: Split into per-operation files under lib/data-access/

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/hooks/use-tags.ts
  found: |
    - Wrong directory + file name
    - useTags → useGetTags
    - Exports Tag interface
    - Import uses `../lib/queryClient`
  implication: Split into per-operation files under lib/data-access/

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/routes/_layout.accounts.tsx
  found: |
    - Contains AccountsPage component — not a shell
    - Uses `function AccountsPage()` — needs `const`
    - Imports use `../components/` and `../hooks/` — needs @/
  implication: Extract Accounts page component to components/accounts/Accounts.tsx

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/routes/_layout.dashboard.tsx
  found: |
    - Contains DashboardPage component — not a shell
    - Uses `function DashboardPage()` — needs `const`
  implication: Extract Dashboard page to components/dashboard/Dashboard.tsx

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/routes/_layout.tsx
  found: |
    - Contains LayoutShell component — not a shell-only file
    - Uses `function LayoutShell()` — needs `const`
    - Imports use `../components/app-sidebar` — needs @/
  implication: Extract LayoutShell to components/layout/LayoutShell.tsx

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/routes/onboarding.tsx
  found: |
    - Contains OnboardingPage component — not a shell
    - Uses `function OnboardingPage()` — needs `const`
  implication: Extract Onboarding page to components/onboarding/Onboarding.tsx

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/routes/_layout.settings/ (directory)
  found: |
    - Directory-based routing violates flat dot-notation standard
    - route.tsx, categories.tsx, household.tsx, merchant-rules.tsx all contain inline components
    - All use `function` keyword
    - All import via ../../hooks/ and ../../lib/ (relative) instead of @/
    - categories.tsx and merchant-rules.tsx have multiple components in one file
  implication: Flatten to _layout.settings.tsx etc., extract components

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/components/accounts/account-sheet.tsx
  found: |
    - Uses `export function AccountSheet` — needs `export const AccountSheet =`
    - File name should be AccountSheet.tsx (PascalCase)
    - Imports use ../../hooks/ — needs @/
  implication: Rename file to AccountSheet.tsx, fix export and imports

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/components/accounts/accounts-table.tsx
  found: |
    - Uses `export function AccountsTable` — needs `export const AccountsTable =`
    - File name should be AccountsTable.tsx (PascalCase)
    - No relative imports going up
  implication: Rename file to AccountsTable.tsx, fix export

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/components/app-sidebar.tsx
  found: |
    - Uses `export function AppSidebar` — needs `export const AppSidebar =`
    - File name should be AppSidebar.tsx (PascalCase)
    - No relative up-directory imports
  implication: Rename file to AppSidebar.tsx, fix export

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/lib/format-currency.ts
  found: |
    - Uses `export function formatCurrency` — needs `export const formatCurrency =`
    - File name should be formatCurrency.ts (camelCase)
  implication: Rename file, fix export

- timestamp: 2026-04-02T00:00:00Z
  checked: apps/web/src/lib/queryClient.ts
  found: |
    - Already uses const arrow functions — compliant
    - File name is camelCase — compliant
  implication: No changes needed

## Resolution

root_cause: Code was written before standards were defined. Multiple categories of violations existed across all modified files: wrong hook directory, missing per-operation file split, function keyword instead of const, relative ../  imports instead of @/, route files containing page logic, monolithic files with multiple components, wrong file/export naming casing.
fix: |
  1. Created apps/web/src/lib/data-access/ with per-operation files:
     - useGetAccounts.ts, useGetAccountMembers.ts, useGetOrgMembers.ts
     - useCreateAccount.ts, useUpdateAccount.ts, useArchiveAccount.ts
     - useGetCategories.ts, useCreateCategory.ts, useUpdateCategory.ts, useArchiveCategory.ts, useReorderCategories.ts
     - useGetMerchantRules.ts, useCreateMerchantRule.ts, useUpdateMerchantRule.ts, useDeleteMerchantRule.ts, useReorderMerchantRules.ts
     - useGetTags.ts, useCreateTag.ts, useArchiveTag.ts
     - useGetHouseholdSettings.ts, useUpdateHouseholdSettings.ts
  2. Created PascalCase component files:
     - components/accounts/AccountSheet.tsx, AccountsTable.tsx, Accounts.tsx
     - components/AppSidebar.tsx
     - components/layout/LayoutShell.tsx
     - components/dashboard/Dashboard.tsx
     - components/onboarding/Onboarding.tsx
     - components/categories/ColourPicker.tsx, LucideIconPicker.tsx
     - components/settings/CategoryDialog.tsx, CategoriesSettings.tsx
     - components/settings/RuleDialog.tsx, MerchantRulesSettings.tsx, HouseholdSettings.tsx
  3. Stripped all route files to shell-only (Route export + component import)
  4. Updated _layout.settings/ route files to import from new page components
  5. Fixed all `function` exports to `const` arrow functions in old kebab-case files
  6. Fixed ../ imports to @/ in old files
  7. Created lib/formatCurrency.ts (camelCase, const export)
verification: pnpm --filter web typecheck — zero new errors introduced; all pre-existing errors are in packages/ui and unrelated sign-in/sign-up routes
files_changed:
  - apps/web/src/lib/data-access/useGetAccounts.ts (created)
  - apps/web/src/lib/data-access/useGetAccountMembers.ts (created)
  - apps/web/src/lib/data-access/useGetOrgMembers.ts (created)
  - apps/web/src/lib/data-access/useCreateAccount.ts (created)
  - apps/web/src/lib/data-access/useUpdateAccount.ts (created)
  - apps/web/src/lib/data-access/useArchiveAccount.ts (created)
  - apps/web/src/lib/data-access/useGetCategories.ts (created)
  - apps/web/src/lib/data-access/useCreateCategory.ts (created)
  - apps/web/src/lib/data-access/useUpdateCategory.ts (created)
  - apps/web/src/lib/data-access/useArchiveCategory.ts (created)
  - apps/web/src/lib/data-access/useReorderCategories.ts (created)
  - apps/web/src/lib/data-access/useGetMerchantRules.ts (created)
  - apps/web/src/lib/data-access/useCreateMerchantRule.ts (created)
  - apps/web/src/lib/data-access/useUpdateMerchantRule.ts (created)
  - apps/web/src/lib/data-access/useDeleteMerchantRule.ts (created)
  - apps/web/src/lib/data-access/useReorderMerchantRules.ts (created)
  - apps/web/src/lib/data-access/useGetTags.ts (created)
  - apps/web/src/lib/data-access/useCreateTag.ts (created)
  - apps/web/src/lib/data-access/useArchiveTag.ts (created)
  - apps/web/src/lib/data-access/useGetHouseholdSettings.ts (created)
  - apps/web/src/lib/data-access/useUpdateHouseholdSettings.ts (created)
  - apps/web/src/lib/formatCurrency.ts (created)
  - apps/web/src/components/accounts/AccountSheet.tsx (created)
  - apps/web/src/components/accounts/AccountsTable.tsx (created)
  - apps/web/src/components/accounts/Accounts.tsx (created)
  - apps/web/src/components/AppSidebar.tsx (created)
  - apps/web/src/components/layout/LayoutShell.tsx (created)
  - apps/web/src/components/dashboard/Dashboard.tsx (created)
  - apps/web/src/components/onboarding/Onboarding.tsx (created)
  - apps/web/src/components/categories/ColourPicker.tsx (created)
  - apps/web/src/components/categories/LucideIconPicker.tsx (created)
  - apps/web/src/components/settings/CategoryDialog.tsx (created)
  - apps/web/src/components/settings/CategoriesSettings.tsx (created)
  - apps/web/src/components/settings/RuleDialog.tsx (created)
  - apps/web/src/components/settings/MerchantRulesSettings.tsx (created)
  - apps/web/src/components/settings/HouseholdSettings.tsx (created)
  - apps/web/src/routes/_layout.accounts.tsx (stripped to shell)
  - apps/web/src/routes/_layout.dashboard.tsx (stripped to shell)
  - apps/web/src/routes/_layout.tsx (stripped to shell)
  - apps/web/src/routes/onboarding.tsx (stripped to shell)
  - apps/web/src/routes/_layout.settings/route.tsx (stripped to shell)
  - apps/web/src/routes/_layout.settings/categories.tsx (stripped to shell)
  - apps/web/src/routes/_layout.settings/household.tsx (stripped to shell)
  - apps/web/src/routes/_layout.settings/merchant-rules.tsx (stripped to shell)
  - apps/web/src/lib/format-currency.ts (function → const)
  - apps/web/src/components/app-sidebar.tsx (function → const)
  - apps/web/src/components/accounts/account-sheet.tsx (function → const, imports → @/)
  - apps/web/src/components/accounts/accounts-table.tsx (function → const)
  - apps/web/src/components/categories/colour-picker.tsx (function → const)
  - apps/web/src/components/categories/icon-picker.tsx (function → const x2)
