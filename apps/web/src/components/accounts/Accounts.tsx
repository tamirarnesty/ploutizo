import { useEffect, useRef, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Button } from '@ploutizo/ui/components/button';
import { Page } from '@ploutizo/ui/components/page';
import type { AccountType } from '@ploutizo/types';
import type { Account } from '@ploutizo/validators';
import { PageHeader } from '@/components/PageHeader';
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

  return (
    <Page>
      {/* Rendered inside the header so its SheetTrigger lands where the
          button was; Sheet/portal parts emit no inline DOM. Page content
          must stay outside the Sheet root — dialogs inside it are marked
          nested by Base UI and lose their backdrop overlay. */}
      <PageHeader
        title="Accounts"
        actions={
          <AccountSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            account={editingAccount}
            defaultType={createAccountType}
            trigger={
              <Button
                type="button"
                className="shrink-0"
                onClick={handleAddClick}
              >
                Add account
              </Button>
            }
          />
        }
      />

      <AccountsTable
        accounts={accounts}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        onAddClick={handleAddClick}
      />
    </Page>
  );
};
