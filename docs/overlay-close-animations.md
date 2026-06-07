# Dialog and sheet close animations

Base UI `Dialog`, `AlertDialog`, and `Sheet` (see `packages/ui`) run exit animations via `data-closed` / `data-ending-style` while `open` transitions to `false`. If the overlay root unmounts in the same render, the close animation is cut off.

## Do

- Keep the `Dialog` / `AlertDialog` / `Sheet` root mounted; control visibility with `open` only.
- On close, set `open` to `false` only — do not clear entity/account/selection state in the same handler.
- Reset entity state on the next open path (`openCreate`, `openEdit`, `handleSettleClick`, etc.), not when closing.
- If the wrapper must not mount when idle, use `if (!open && !entity) return null` — never `if (!entity) return null` alone.

## Don't

- `return null` when entity data is cleared while the overlay was open (unmounts the whole tree).
- Clear `activeAccount`, `editingAccount`, `entity`, or similar in `handleClose` / `onOpenChange(false)` together with `setOpen(false)`.
- Change a child `key` / `formKey` tied to entity id on close (e.g. `entity?.id ?? 'new'`) while `open` is still animating — remounts form content mid-exit.

## Reference implementations

- `apps/web/src/components/dashboard/SettleDialog.tsx` + `Dashboard.tsx` (`handleClose`)
- `apps/web/src/components/transactions/Transactions.tsx` (`handleSheetClose` — keeps `selectedTx`)
- `apps/web/src/hooks/useSettingsEntityDialog.ts` + `SettingsFormDialog` / `CategoryDialog`

## Regression tests

Mount + parent state contract; run `pnpm --filter web test`.

**Shared**

- `apps/web/src/test/overlayCloseContract.ts`
- `apps/web/src/test/overlayParentStateHarness.ts`
- `apps/web/src/test/overlayParentState.contract.test.ts`

**Components**

- `SettleDialog.test.tsx`
- `AccountSheet.test.tsx`
- `TransactionSheet.test.tsx`
- `SettingsFormDialog.test.tsx`
- `CategoryDialog.test.tsx`
- `RuleDialog.test.tsx`
- `DeleteTransactionDialog.test.tsx`

**Hook**

- `useSettingsEntityDialog.test.ts`

When changing parent close handlers (`Dashboard`, `Accounts`, `Transactions`) or the harness, keep them in sync.
