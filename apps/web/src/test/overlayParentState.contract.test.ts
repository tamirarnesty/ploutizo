import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  useAccountsSheetParentState,
  useDashboardSettleDialogParentState,
  useTransactionsSheetParentState,
} from '@/test/overlayParentStateHarness';
import {
  mockAccount,
  mockSettlementAccount,
  mockTransactionRow,
} from '@/test/overlayFixtures';

describe('overlay parent state contract', () => {
  describe('Dashboard settle dialog (Dashboard.tsx)', () => {
    it('handleClose only sets open false and keeps activeAccount', () => {
      const account = mockSettlementAccount();
      const { result } = renderHook(() =>
        useDashboardSettleDialogParentState()
      );

      act(() => result.current.handleSettleClick(account, 'mAda'));
      act(() => result.current.handleClose());

      expect(result.current.dialogOpen).toBe(false);
      expect(result.current.activeAccount).toBe(account);
      expect(result.current.dialogPayToward).toBe('mAda');
    });
  });

  describe('Accounts sheet (Accounts.tsx)', () => {
    it('handleSheetClose only sets open false and keeps editingAccount', () => {
      const account = mockAccount();
      const { result } = renderHook(() => useAccountsSheetParentState());

      act(() => result.current.handleRowClick(account));
      act(() => result.current.handleSheetClose());

      expect(result.current.sheetOpen).toBe(false);
      expect(result.current.editingAccount).toBe(account);
    });

    it('handleAddClick clears account before open', () => {
      const { result } = renderHook(() => useAccountsSheetParentState());

      act(() => result.current.handleRowClick(mockAccount()));
      act(() => result.current.handleAddClick());

      expect(result.current.sheetOpen).toBe(true);
      expect(result.current.editingAccount).toBeNull();
    });
  });

  describe('Transactions sheet (Transactions.tsx)', () => {
    it('handleSheetClose only sets open false and keeps selectedTx', () => {
      const tx = mockTransactionRow();
      const { result } = renderHook(() => useTransactionsSheetParentState());

      act(() => result.current.handleEdit(tx));
      act(() => result.current.handleSheetClose());

      expect(result.current.sheetOpen).toBe(false);
      expect(result.current.selectedTx).toBe(tx);
    });

    it('handleAddClick clears transaction before open', () => {
      const { result } = renderHook(() => useTransactionsSheetParentState());

      act(() => result.current.handleEdit(mockTransactionRow()));
      act(() => result.current.handleAddClick());

      expect(result.current.sheetOpen).toBe(true);
      expect(result.current.selectedTx).toBeNull();
    });
  });
});
