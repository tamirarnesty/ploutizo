import { useEffect, useRef, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import type { Account, AccountType } from '@ploutizo/types';
import { useGetAccounts } from '@/lib/data-access/accounts';
import {
  accountsRoute,
  parseAccountCreateLocationState,
} from '@/lib/navigation';
import { AccountsTable } from './AccountsTable';
import { AccountSheet } from './AccountSheet';

export const Accounts = () => {
  const { data: accounts = [], isLoading } = useGetAccounts();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [createAccountType, setCreateAccountType] = useState<
    AccountType | undefined
  >();
  const navigate = useNavigate();
  const rawCreateAccount = useRouterState({
    select: (state) => state.location.state.createAccount,
  });
  const consumedStateKey = useRef<string | null>(null);

  useEffect(() => {
    const createAccountState =
      parseAccountCreateLocationState(rawCreateAccount);
    if (!createAccountState) return;
    const stateKey = JSON.stringify(createAccountState);
    if (consumedStateKey.current === stateKey) return;
    consumedStateKey.current = stateKey;

    setEditingAccount(null);
    setCreateAccountType(createAccountState.type);
    setSheetOpen(true);

    void navigate({
      ...accountsRoute,
      replace: true,
      state: { createAccount: undefined },
    });
  }, [rawCreateAccount, navigate]);

  const handleAddClick = () => {
    setEditingAccount(null);
    setCreateAccountType(undefined);
    setSheetOpen(true);
  };
  const handleRowClick = (account: Account) => {
    setEditingAccount(account);
    setSheetOpen(true);
  };
  const handleSheetClose = () => {
    setSheetOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Text as="h1" variant="h3" className="min-w-0 truncate">
          Accounts
        </Text>
        <Button type="button" onClick={handleAddClick} className="shrink-0">
          Add account
        </Button>
      </div>

      <AccountsTable
        accounts={accounts}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        onAddClick={handleAddClick}
      />

      <AccountSheet
        open={sheetOpen}
        account={editingAccount}
        defaultType={createAccountType}
        onClose={handleSheetClose}
      />
    </div>
  );
};
