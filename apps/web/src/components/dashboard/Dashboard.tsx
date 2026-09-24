import { useCallback, useMemo, useState } from 'react';
import type { PayToward } from '@/components/dashboard/settleFormSchema';
import type { CardBalanceRowViewModel } from '@/components/dashboard/card-balances/buildCardBalanceViewModels';
import type { CardBalancesSettleClickHandler } from '@/components/dashboard/card-balances/types';
import { buildCardBalanceViewModels } from '@/components/dashboard/card-balances/buildCardBalanceViewModels';
import { useGetHouseholdMembers } from '@/lib/data-access/household';
import { useGetSettlements } from '@/lib/data-access/settlements';
import { selectCreditCardAccounts } from '@/lib/settlements';
import { CardBalancesGrid } from '@/components/dashboard/card-balances/CardBalancesGrid';
import { DashboardHeader } from './DashboardHeader';
import { SettleDialog } from './SettleDialog';
import { SettlementSummaryPane } from './SettlementSummaryPane';

// All queries fire at top level — no waterfalls (vercel-react-best-practices).
export const Dashboard = () => {
  const {
    data: settlements,
    isLoading: settlementsLoading,
    isError: settlementsError,
    isFetching: settlementsFetching,
    refetch: refetchSettlements,
  } = useGetSettlements();
  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
    isFetching: membersFetching,
    refetch: refetchMembers,
  } = useGetHouseholdMembers();

  // Both live cards read the same two queries, so they share loading and error state.
  const liveSectionsLoading = settlementsLoading || membersLoading;
  const liveSectionsError = settlementsError || membersError;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeAccount, setActiveAccount] =
    useState<CardBalanceRowViewModel | null>(null);
  const [dialogPayToward, setDialogPayToward] = useState<PayToward | null>(
    null
  );

  const creditCardAccounts = useMemo(
    () => selectCreditCardAccounts(settlements?.accounts),
    [settlements?.accounts]
  );

  const cardBalanceRows = useMemo(
    () => buildCardBalanceViewModels(creditCardAccounts, members),
    [creditCardAccounts, members]
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
  }, []);

  const handleRetry = useCallback(() => {
    void refetchSettlements();
    void refetchMembers();
  }, [refetchSettlements, refetchMembers]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        onRetry={handleRetry}
        isRefreshing={settlementsFetching || membersFetching}
      />

      {/*
        Container query, not a viewport breakpoint: cards must also reflow when
        the sidebar opens or closes, which only changes the available width.
      */}
      <div className="@container/dashboard">
        <div className="grid grid-cols-1 items-start gap-4 @4xl/dashboard:grid-cols-4">
          <div className="min-w-0 @4xl/dashboard:col-span-3">
            <CardBalancesGrid
              rows={cardBalanceRows}
              isLoading={liveSectionsLoading}
              isError={liveSectionsError}
              onSettleClick={handleSettleClick}
            />
          </div>
          <div className="min-w-0 @4xl/dashboard:col-span-1">
            <SettlementSummaryPane
              accounts={settlements?.accounts}
              error={liveSectionsError}
              isLoading={liveSectionsLoading}
              members={members}
            />
          </div>
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
