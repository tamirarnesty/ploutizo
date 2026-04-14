---
created: 2026-04-14T20:15:41.816Z
title: Category edit should reflect changes in list without reload
area: ui
files:
  - apps/web/src/components/settings/CategoriesSettings.tsx:75
  - apps/web/src/lib/data-access/categories/useUpdateCategory.ts:23
---

## Problem

After editing a category (e.g. changing its colour), the change is not reflected in the list until a full page reload. `useUpdateCategory` correctly calls `qc.invalidateQueries({ queryKey: ["categories"] })` on settled, so the server data is fresh — but `CategoriesSettings.tsx` ignores the refetch.

Root cause: `CategoriesSettings.tsx:75` uses an `initialized.current` flag to seed `localCategories` only once. After initialization, the `useEffect` that syncs from `categories` (the query result) is gated behind `!initialized.current` and never runs again. When the query refetches after mutation, the component is still rendering stale `localCategories`.

## Solution

Reset `initialized.current = false` inside `useUpdateCategory`'s `onSettled` (or `onSuccess`) callback so the next `useEffect` run re-seeds `localCategories` from fresh query data. Alternatively, merge the updated category directly into `localCategories` in the mutation's `onMutate`/`onSuccess` for instant optimistic feedback.
