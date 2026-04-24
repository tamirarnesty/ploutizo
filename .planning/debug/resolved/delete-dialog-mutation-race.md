---
slug: delete-dialog-mutation-race
status: resolved
created: 2026-04-17
updated: 2026-04-17
trigger: "when trying to delete a transaction from the Delete Dialog (via Transaction form sheet or transaction row action menu) the dialog's Delete button fails to perform the delete, pre-emptively re-fetching the transactions list for the table, and does not dismiss the dialog. it inconsistently fails or succeeds and is hard to reproduce"
---

## Symptoms

- **Expected:** Clicking Delete in the Delete Dialog calls the DELETE API, shows a success toast, and dismisses the dialog
- **Actual (from form sheet):** DELETE API call never fires, but a toast still shows; dialog does not close
- **Actual (from row menu after refresh):** DELETE API fires correctly, correct toast shows, but dialog still does not close
- **Errors:** No console errors in either case
- **Trigger pattern:** Opening the Transaction form sheet first correlates with the API-not-firing failure; after page refresh + using row action menu, the API call does happen
- **Reproduction:** Inconsistent; opening the form first makes failure more likely

## Current Focus

hypothesis: "AlertDialogAction is a plain Button, not a Close primitive — dialog never closes on confirm"
test: "verified via alert-dialog.tsx source: only AlertDialogCancel wraps AlertDialogPrimitive.Close"
expecting: "onOpenChange(false) never fires from AlertDialogAction.onClick"
next_action: "resolved"
reasoning_checkpoint: "prior commit comment claimed AlertDialogAction fires onClick before close — factually incorrect for this Base UI implementation"
tdd_checkpoint: ""

## Evidence

- timestamp: 2026-04-17T00:00:00Z
  finding: "packages/ui/src/components/alert-dialog.tsx line 144-155: AlertDialogAction renders a plain Button with no Close primitive"
  source: "packages/ui/src/components/alert-dialog.tsx"

- timestamp: 2026-04-17T00:00:00Z
  finding: "AlertDialogCancel (lines 157-172) wraps AlertDialogPrimitive.Close — only cancel auto-closes the dialog"
  source: "packages/ui/src/components/alert-dialog.tsx"

- timestamp: 2026-04-17T00:00:00Z
  finding: "Prior fix commit 02c6f92 removed setDeleteId(null) from TransactionsTable.handleConfirmDelete, relying on AlertDialogAction to close — but it does not"
  source: "git show 02c6f92 -- TransactionsTable.tsx"

- timestamp: 2026-04-17T00:00:00Z
  finding: "'API never fires but toast shows' from form sheet is observer error: useDeleteTransaction.onMutate removes row optimistically before network response; dialog stays open so user sees nothing happen, but mutation did fire. Toast in onSuccess confirms API succeeded."
  source: "useDeleteTransaction.ts onMutate + TransactionForm.tsx onConfirm"

## Eliminated Hypotheses

- Two mutation instances interfering (form + table both mount useDeleteTransaction): eliminated — separate instances, no shared state
- transaction prop is null inside onConfirm guard: eliminated — DeleteTransactionDialog only renders when isEditing=true

## Resolution

root_cause: "Three layered bugs: (1) AlertDialogAction is a plain Button — never auto-closes the dialog. (2) useDeleteTransaction.onMutate called setQueriesData({ queryKey: ['transactions'] }) which prefix-matched the detail query ['transactions', id] from useGetTransaction; old.data was undefined on TransactionRow, throwing and aborting the mutation before the DELETE API fired. (3) onSettled invalidateQueries(['transactions']) also matched the detail query, triggering a GET /transactions/{id} after deletion → 404 errors and delayed drawer close."
fix: "(1) DeleteTransactionDialog.AlertDialogAction.onClick now calls onConfirm() then onOpenChange(false) explicitly. (2) setQueriesData updater guards with Array.isArray(old.data) to skip non-list entries. (3) useGetTransaction query key changed from ['transactions', id] to ['transaction', id] (singular) so it is fully excluded from all prefix-based mutation operations."
verification: "Confirmed working: delete fires correctly from both row menu and form sheet, dialog closes immediately, no 404 errors, drawer closes without delay."
files_changed: "apps/web/src/components/transactions/DeleteTransactionDialog.tsx, apps/web/src/lib/data-access/transactions/useDeleteTransaction.ts, apps/web/src/lib/data-access/transactions/useGetTransaction.ts"
