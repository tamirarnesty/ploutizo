/**
 * State harnesses mirroring parent screens — keep in sync with:
 * - Dashboard.tsx (settle dialog)
 * - Accounts.tsx (account sheet)
 * - Transactions.tsx (transaction sheet)
 */
import { useCallback, useState } from 'react';
import type {
  Account,
  AccountType,
  SettlementAccountRow,
} from '@ploutizo/types';
import type { PayToward } from '@/components/dashboard/settleFormSchema';
import type { TransactionRow } from '@/lib/data-access/transactions';

/** @see apps/web/src/components/dashboard/Dashboard.tsx */
export const useDashboardSettleDialogParentState = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeAccount, setActiveAccount] =
    useState<SettlementAccountRow | null>(null);
  const [dialogPayToward, setDialogPayToward] = useState<PayToward | null>(
    null
  );

  const handleSettleClick = useCallback(
    (account: SettlementAccountRow, payToward: PayToward) => {
      setActiveAccount(account);
      setDialogPayToward(payToward);
      setDialogOpen(true);
    },
    []
  );

  const handleClose = useCallback(() => {
    setDialogOpen(false);
  }, []);

  return {
    dialogOpen,
    activeAccount,
    dialogPayToward,
    handleSettleClick,
    handleClose,
  };
};

/** @see apps/web/src/components/accounts/Accounts.tsx */
export const useAccountsSheetParentState = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [createAccountType, setCreateAccountType] = useState<
    AccountType | undefined
  >();

  const handleAddClick = useCallback(() => {
    setEditingAccount(null);
    setCreateAccountType(undefined);
    setSheetOpen(true);
  }, []);

  const handleRowClick = useCallback((account: Account) => {
    setEditingAccount(account);
    setSheetOpen(true);
  }, []);

  const handleCreateFromRoute = useCallback((type: AccountType) => {
    setEditingAccount(null);
    setCreateAccountType(type);
    setSheetOpen(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
  }, []);

  return {
    sheetOpen,
    editingAccount,
    createAccountType,
    handleAddClick,
    handleRowClick,
    handleCreateFromRoute,
    handleSheetClose,
  };
};

/** @see apps/web/src/components/transactions/Transactions.tsx */
export const useTransactionsSheetParentState = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);

  const handleAddClick = useCallback(() => {
    setSelectedTx(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((transaction: TransactionRow) => {
    setSelectedTx(transaction);
    setSheetOpen(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
  }, []);

  return {
    sheetOpen,
    selectedTx,
    handleAddClick,
    handleEdit,
    handleSheetClose,
  };
};
