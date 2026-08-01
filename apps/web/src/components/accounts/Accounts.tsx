import { useState } from 'react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import type { Account } from '@ploutizo/types';
import { useGetAccounts } from '@/lib/data-access/accounts';
import { TelemetryReplayBlock } from '@/telemetry';
import { AccountsTable } from './AccountsTable';
import { AccountSheet } from './AccountSheet';

export const Accounts = () => {
  const { data: accounts = [], isLoading } = useGetAccounts();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleAddClick = () => {
    setEditingAccount(null);
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

      <TelemetryReplayBlock>
        <AccountsTable
          accounts={accounts}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          onAddClick={handleAddClick}
        />
      </TelemetryReplayBlock>

      <AccountSheet
        open={sheetOpen}
        account={editingAccount}
        onClose={handleSheetClose}
      />
    </div>
  );
};
