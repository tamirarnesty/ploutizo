---
status: resolved
trigger: "TailwindCSS font utility classes are using wrong syntax. Arbitrary CSS variable syntax `font-[--font-heading]` is used throughout the project instead of the semantic utility `font-heading`"
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Focus

hypothesis: All occurrences of `font-[--font-heading]` should be replaced with `font-heading` — the semantic Tailwind v4 utility class auto-generated from the `--font-heading` CSS custom property
test: Search codebase for all `font-[--font` usages in app source files
expecting: 5 files in apps/web need the fix
next_action: Await human verification that font rendering is correct

## Symptoms

expected: Font utility classes should use semantic names like `font-heading` corresponding to CSS custom properties defined in globals.css (--font-heading: 'Noto Sans Variable')
actual: Classes like `font-[--font-heading]` are used instead, which is incorrect Tailwind arbitrary value syntax and won't resolve to the correct font
errors: No runtime errors — visual issue where fonts don't load correctly
reproduction: Inspect any component using font classes in the codebase
started: Introduced during phase 02.1 code style refactor (branch: gsd/phase-02.1-code-style-form-patterns-refactor)

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-03T00:00:00Z
  checked: packages/ui/src/styles/globals.css line 153-154
  found: `--font-sans: 'Geist Variable', sans-serif;` and `--font-heading: 'Noto Sans Variable', sans-serif;` defined in :root
  implication: In Tailwind v4, these CSS custom properties in :root automatically generate `font-sans` and `font-heading` utility classes

- timestamp: 2026-04-03T00:00:00Z
  checked: Grep for `font-[--font` in apps/ directory
  found: 5 source files affected:
    - apps/web/src/components/onboarding/Onboarding.tsx
    - apps/web/src/components/dashboard/Dashboard.tsx
    - apps/web/src/components/settings/CategoriesSettings.tsx
    - apps/web/src/components/settings/HouseholdSettings.tsx
    - apps/web/src/components/accounts/Accounts.tsx
  implication: All 5 files use incorrect arbitrary syntax instead of `font-heading`

## Resolution

root_cause: During phase 02.1 refactor, font utility classes were written using arbitrary CSS variable syntax `font-[--font-heading]` instead of the semantic Tailwind v4 utility `font-heading`. In Tailwind v4, CSS custom properties defined in `:root` (like `--font-heading`) auto-generate corresponding utility classes (like `font-heading`), so the arbitrary syntax is both unnecessary and incorrect.
fix: Replace `font-[--font-heading]` with `font-heading` in all 5 affected source files
verification: Post-fix grep for `font-[--font` in apps/web/src returns no matches. All 5 files updated.
files_changed:
  - apps/web/src/components/onboarding/Onboarding.tsx
  - apps/web/src/components/dashboard/Dashboard.tsx
  - apps/web/src/components/settings/CategoriesSettings.tsx
  - apps/web/src/components/settings/HouseholdSettings.tsx
  - apps/web/src/components/accounts/Accounts.tsx
