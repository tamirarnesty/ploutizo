import { useCallback, useMemo, useState } from 'react';
import { Text } from '@ploutizo/ui/components/text';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { CardBalancesSettleClickHandler } from '@/components/dashboard/card-balances/types';
import type { PayToward } from '@/components/dashboard/settleFormSchema';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { useGetSettlements } from '@/lib/data-access/settlements';
import { selectCreditCardAccounts } from '@/lib/settlements';
import { CardBalancesGrid } from '@/components/dashboard/card-balances/CardBalancesGrid';
import { SettleDialog } from './SettleDialog';
import { SettlementSummaryPane } from './SettlementSummaryPane';

// All queries fire at top level — no waterfalls (vercel-react-best-practices).
export const Dashboard = () => {
  const {
    data: settlements,
    isLoading: settlementsLoading,
    isError: settlementsError,
  } = useGetSettlements();
  const { data: members = [], isLoading: membersLoading } = useGetOrgMembers();
  const summaryPaneLoading = settlementsLoading || membersLoading;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeAccount, setActiveAccount] =
    useState<SettlementAccountRow | null>(null);
  const [dialogPayToward, setDialogPayToward] = useState<PayToward | null>(
    null
  );

  const creditCardAccounts = useMemo(
    () => selectCreditCardAccounts(settlements?.accounts),
    [settlements?.accounts]
  );

  const handleSettleClick = useCallback<CardBalancesSettleClickHandler>(
    (account, payToward) => {
      setActiveAccount(account);
      setDialogPayToward(payToward);
      setDialogOpen(true);
    },
    []
  );

  const handleClose = useCallback(() => {
    setDialogOpen(false);
    setActiveAccount(null);
    setDialogPayToward(null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <Text as="h1" variant="h2" className="min-w-0 truncate">
          Dashboard
        </Text>
        <Text variant="caption" className="text-muted-foreground">
          {`Family overview · ${members.length} member${members.length === 1 ? '' : 's'}`}
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="min-w-0 md:col-span-3">
          {settlementsError ? (
            <Text variant="error">
              Couldn&apos;t load card balances. Check your connection and try
              again.
            </Text>
          ) : (
            <CardBalancesGrid
              accounts={creditCardAccounts}
              isLoading={settlementsLoading}
              onSettleClick={handleSettleClick}
            />
          )}
        </div>
        <div className="min-w-0 md:col-span-1">
          <SettlementSummaryPane
            accounts={settlements?.accounts}
            isLoading={summaryPaneLoading}
            members={members}
          />
        </div>
      </div>

      <SettleDialog
        open={dialogOpen}
        account={activeAccount}
        initialPayToward={dialogPayToward}
        onClose={handleClose}
      />
    </div>
  );
};
