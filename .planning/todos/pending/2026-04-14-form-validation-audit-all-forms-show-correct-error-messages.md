---
created: 2026-04-14T20:15:41.816Z
title: Form validation audit — all forms must show correct error messages
area: ui
files:
  - apps/web/src/components/accounts/AccountForm.tsx:219
---

## Problem

Create Account form shows `[Object object]` instead of the validation error message. Root cause: `AccountForm.tsx:219` uses `String(field.state.meta.errors[0])` but `field.state.meta.errors[0]` in TanStack Form is a `ValidationError` object, not a string — `String()` coerces it to `[Object object]`.

The fix is `field.state.meta.errors[0]?.message ?? String(field.state.meta.errors[0])` or using the `errorMap` approach consistently. This pattern likely exists in other forms across the app.

## Solution

1. Audit all forms in `apps/web/src/components/` that render `field.state.meta.errors`
2. Replace bare `String(errors[0])` with `.message` extraction (or use the `FieldError` component from `@tanstack/react-form` which handles this automatically)
3. Verify fix in: AccountForm, and all other forms that follow the same pattern (CategoryForm, TagForm, MerchantRuleForm, HouseholdSettingsForm, TransactionForm, etc.)
