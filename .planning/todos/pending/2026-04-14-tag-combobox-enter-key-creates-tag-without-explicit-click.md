---
created: 2026-04-14T20:15:41.816Z
title: Tag combobox Enter key should create tag without explicit click
area: ui
files:
  - apps/web/src/components/settings/CategoriesSettings.tsx
---

## Problem

In the tag combobox, when a user types a tag name that doesn't exist and the "Create" option appears in the results list, pressing Enter does not trigger the create action — the user must click the "Create" option with the mouse. This breaks keyboard-only flow and is inconsistent with typical combobox UX where Enter confirms the highlighted/active option.

## Solution

Wire an `onKeyDown` handler (or use the combobox's built-in `onSelect` on the "Create" item) so that pressing Enter while the "Create" option is highlighted triggers the same create action as clicking it. The `cmdk` Command component (used by shadcn Combobox) emits a `select` event on Enter for the focused item — ensure the "Create" option item calls `onSelect` and that the handler creates the tag via `useCreateTag`.
