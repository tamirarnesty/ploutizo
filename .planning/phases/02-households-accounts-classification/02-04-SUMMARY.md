---
phase: 02-households-accounts-classification
plan: "04"
subsystem: classification-api-and-ui
tags: [api, ui, categories, tags, merchant-rules, react-query, drag-and-drop]
dependency_graph:
  requires: [02-01, 02-02, 02-03]
  provides: [categories-api, tags-api, merchant-rules-api, categories-settings-page, merchant-rules-settings-page]
  affects: [future-transactions, future-import, future-budgets]
tech_stack:
  added:
    - "@reui/sortable (dnd-kit-based drag-to-reorder component)"
  patterns:
    - "Hono route ordering: /reorder before /:id to prevent param capture"
    - "TDD: test files committed before implementation (RED then GREEN)"
    - "Optimistic local state for drag-to-reorder with server sync"
    - "Regex validation: both client-side (onBlur) and server-side (new RegExp check)"
key_files:
  created:
    - apps/api/src/routes/categories.ts
    - apps/api/src/routes/tags.ts
    - apps/api/src/routes/merchant-rules.ts
    - apps/api/src/__tests__/categories.test.ts
    - apps/api/src/__tests__/tags.test.ts
    - apps/api/src/__tests__/merchant-rules.test.ts
    - apps/web/src/hooks/use-categories.ts
    - apps/web/src/hooks/use-tags.ts
    - apps/web/src/hooks/use-merchant-rules.ts
    - apps/web/src/components/categories/icon-picker.tsx
    - apps/web/src/components/categories/colour-picker.tsx
    - apps/web/src/routes/_layout.settings/categories.tsx
    - apps/web/src/routes/_layout.settings/merchant-rules.tsx
    - packages/ui/src/components/reui/sortable.tsx
  modified:
    - apps/api/src/index.ts (route mounts added)
    - packages/validators/src/index.ts (classification schemas appended)
    - packages/ui/components.json (already had @reui registry)
    - pnpm-lock.yaml (sortable install)
decisions:
  - "reorderSchema uses z.string().uuid() — test IDs updated to valid UUIDs (non-UUID strings correctly fail validation)"
  - "Sortable component uses strategy prop (not layout prop as plan doc suggested); confirmed from installed source"
  - "categories.tsx uses plain setState for optimistic reorder, not React Query optimistic updates, to keep code simple"
metrics:
  duration: "443 seconds (~7 minutes)"
  completed_date: "2026-04-01"
  tasks_completed: 3
  files_created: 14
  files_modified: 4
---

# Phase 02 Plan 04: Categories, Tags, and Merchant Rules Summary

Categories, tags, and merchant rules API routes + Settings UI pages with drag-to-reorder (ReUI Sortable), regex validation, and icon/colour pickers — completing all classification data structures for Phase 2.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 (RED) | TDD: Failing tests for categories, tags, merchant-rules routes | f50bb64 |
| 1 (GREEN) | API routes + validators implementation (all 26 tests pass) | dadc68b |
| 2 | Install ReUI Sortable + React Query hooks | 6d2bb6d |
| 3 | Categories/Tags page + Merchant Rules page + icon/colour pickers | 1ad1866 |

## What Was Built

### API Routes

**categoriesRouter** (`apps/api/src/routes/categories.ts`):
- `GET /` — active categories ordered by sortOrder
- `POST /` — create category with createCategorySchema validation
- `PATCH /reorder` — atomic transaction updating sortOrder for each item (registered before `/:id`)
- `PATCH /:id` — partial update with updateCategorySchema
- `DELETE /:id/archive` — soft-archive via archivedAt timestamp

**tagsRouter** (`apps/api/src/routes/tags.ts`):
- `GET /` — active tags ordered by name
- `POST /` — create tag with createTagSchema validation
- `DELETE /:id/archive` — soft-archive

**merchantRulesRouter** (`apps/api/src/routes/merchant-rules.ts`):
- `GET /` — rules ordered by priority
- `POST /` — create rule; regex pattern validated server-side with `new RegExp()`; returns 400 `INVALID_REGEX` on invalid
- `PATCH /reorder` — atomic transaction updating priority for each item (registered before `/:id`)
- `PATCH /:id` — partial update with regex validation
- `DELETE /:id` — hard delete (no transaction references)

### Validators Added (`packages/validators/src/index.ts`)

- `createCategorySchema`, `updateCategorySchema`
- `createTagSchema`
- `createMerchantRuleSchema`, `updateMerchantRuleSchema`
- `reorderSchema` (orderedIds: uuid[])

### React Query Hooks

- `use-categories.ts`: useCategories, useCreateCategory, useUpdateCategory, useArchiveCategory, useReorderCategories
- `use-tags.ts`: useTags, useCreateTag, useArchiveTag
- `use-merchant-rules.ts`: useMerchantRules, useCreateMerchantRule, useUpdateMerchantRule, useDeleteMerchantRule, useReorderMerchantRules

### UI Components

- `icon-picker.tsx`: LucideIconPicker with 52 named imports (no `import *`), search filter, 6-column grid, `renderLucideIcon` helper
- `colour-picker.tsx`: ColourPicker with 12 preset swatches (slate through pink), ring-2 ring-offset-2 ring-primary selection style

### Settings Pages

- `/settings/categories`: Categories section (ReUI Sortable drag-to-reorder, Add/Edit/Archive dialogs), Tags section (inline create, immediate archive)
- `/settings/merchant-rules`: ReUI Sortable drag-to-reorder, Add/Edit/Delete dialogs, client-side regex validation on blur, server-side INVALID_REGEX error handling

## Verification Results

- `pnpm test` (API): 7 test files, 26 tests — all pass
- `pnpm test` (validators): 1 test file, 21 tests — all pass
- `pnpm build` (web): exits 0, 2169 + 374 modules transformed
- `INVALID_REGEX` present in merchant-rules.ts
- `isRegexError` state in merchant-rules settings page
- `/reorder` registered at line 11, before `/:id` in categories.ts
- No `import *` in icon-picker.tsx
- No `import.meta.env.VITE_API_URL` in use-merchant-rules.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed non-UUID test IDs in reorder tests**
- **Found during:** Task 1 GREEN phase
- **Issue:** Plan's test spec used `['cat_1', 'cat_2']` and `['rule_1', 'rule_2']` as orderedIds, but `reorderSchema` requires `z.string().uuid()`. These non-UUID strings correctly fail validation and return 400.
- **Fix:** Updated test orderedIds to valid UUIDs: `['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002']`
- **Files modified:** apps/api/src/__tests__/categories.test.ts, apps/api/src/__tests__/merchant-rules.test.ts
- **Commit:** dadc68b

**2. [Rule 1 - Correction] Sortable uses strategy prop, not layout prop**
- **Found during:** Task 3 (reading installed sortable.tsx source)
- **Issue:** Plan doc specified `layout="vertical"` for the Sortable component, but the installed ReUI Sortable uses `strategy="vertical"`.
- **Fix:** Used correct `strategy="vertical"` prop in both settings pages.
- **Files modified:** categories.tsx, merchant-rules.tsx
- **Commit:** 1ad1866

## Known Stubs

None — all data flows from real API endpoints via React Query hooks. No hardcoded empty values or placeholder text in rendered UI paths.

## Self-Check

- [x] All created files exist on disk
- [x] All commits recorded above exist in git log
- [x] pnpm test (API) exits 0
- [x] pnpm test (validators) exits 0
- [x] pnpm build (web) exits 0
