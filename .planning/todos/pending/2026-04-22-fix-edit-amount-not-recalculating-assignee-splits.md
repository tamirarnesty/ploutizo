---
created: 2026-04-22T16:40:00Z
title: Fix edit mode amount not recalculating assignee splits
area: ui
files:
  - apps/web/src/components/transactions/TransactionForm.tsx
  - apps/web/src/components/transactions/AssigneeSection.tsx
---

## Problem

When editing a transaction and changing the Amount, the assignee split amounts (amountCents per assignee) are not recalculated. The splits reflect the original saved amounts rather than the new amount, so the form can be saved with inconsistent split totals.

## Solution

Two options:
1. Recalculate splits reactively on amount change — when amount changes, recompute each assignee's amountCents based on their percentage and the new amount
2. Only derive final amountCents at submit time from `toApiPayload` using the current amount + each assignee's percentage — avoids the reactive complexity

Option 2 is likely cleaner: store percentage as the source of truth in form state, compute amountCents in `toApiPayload` rather than storing it as editable state. Avoids the need for reactive recalculation entirely.
