---
status: resolved
trigger: "add-transaction-button-always-disabled"
created: 2026-04-13T00:00:00Z
updated: 2026-04-13T00:00:00Z
---

## Current Focus

hypothesis: Button has hardcoded `disabled` prop with comment "Disabled until create transaction flow is built" — no condition, always disabled
test: Confirmed by reading Transactions.tsx line 291
expecting: Remove disabled prop, wire button to open a TransactionSheet (same pattern as AccountSheet)
next_action: Create useCreateTransaction hook, TransactionForm, TransactionSheet, update Transactions.tsx

## Symptoms

expected: "Add Transaction" button is enabled and clickable
actual: Button is always rendered in a disabled state regardless of page/data state
errors: None — no crash, just the button is disabled
reproduction: Navigate to /transactions, observe the Add Transaction button is disabled
started: Discovered during manual UAT for phase 03.3. Button may have never been enabled.

## Eliminated

- hypothesis: disabled wired to loading/permission state that's always truthy
  evidence: disabled prop is hardcoded with no condition — just `disabled` boolean attribute
  timestamp: 2026-04-13T00:00:00Z

## Evidence

- timestamp: 2026-04-13T00:00:00Z
  checked: apps/web/src/components/transactions/Transactions.tsx line 289-298
  found: Button has hardcoded `disabled` and `aria-disabled="true"` with comment "Disabled until create transaction flow is built"
  implication: Root cause confirmed — placeholder code, no create flow exists yet

- timestamp: 2026-04-13T00:00:00Z
  checked: apps/web/src/components/accounts/Accounts.tsx + AccountSheet.tsx + AccountForm.tsx
  found: Full sheet pattern: useState for open/editingAccount, AccountSheet wraps AccountForm in Sheet
  implication: Same pattern to replicate for transactions

- timestamp: 2026-04-13T00:00:00Z
  checked: packages/validators/src/index.ts
  found: TransactionFormSchema = createTransactionSchema (discriminated union on 'type')
  implication: Form must handle type switching to show type-specific fields

- timestamp: 2026-04-13T00:00:00Z
  checked: apps/web/src/lib/data-access/transactions/index.ts
  found: No useCreateTransaction hook exists
  implication: Must create it alongside the form

## Resolution

root_cause: Button has `disabled` hardcoded as a placeholder — no create transaction UI existed at time of writing
fix: Create useCreateTransaction mutation hook, TransactionForm component, TransactionSheet component, wire button in Transactions.tsx
verification: empty until verified
files_changed:
  - apps/web/src/lib/data-access/transactions/useCreateTransaction.ts
  - apps/web/src/lib/data-access/transactions/index.ts
  - apps/web/src/components/transactions/TransactionForm.tsx
  - apps/web/src/components/transactions/TransactionSheet.tsx
  - apps/web/src/components/transactions/Transactions.tsx
