---
created: 2026-04-21T19:50:00Z
title: Fix shared account owners not saved or displayed
area: ui
files:
  - apps/web/src/components/accounts/AccountForm.tsx:310
  - apps/web/src/components/accounts/AccountsTable.tsx:105
  - apps/web/src/lib/data-access/accounts/useCreateAccount.ts:11
  - apps/web/src/lib/data-access/accounts/useUpdateAccount.ts:11
---

## Problem

Two related issues:
1. **Form not saving co-owners:** When an account is set to "shared" ownership and co-owners are selected via the `memberIds` field (AccountForm.tsx:310), the owners are not persisted — the table shows "—" in the Owners column after save.
2. **Table not displaying owners:** AccountsTable.tsx:105 has an "Owners" column that renders "—" for all rows, suggesting the API response either isn't returning owner data or the column accessor is wrong.

Likely root causes to investigate:
- `memberIds` may not be included in the create/update API payload when `ownership === "shared"` (check useCreateAccount / useUpdateAccount)
- The API handler may not be writing to the account_owners join table
- The accounts list query may not be joining/returning owner data, so the column has nothing to render

## Solution

Trace the full path: form submit → API payload → API handler → DB write → list query → column render. Fix whichever link in the chain is broken.
