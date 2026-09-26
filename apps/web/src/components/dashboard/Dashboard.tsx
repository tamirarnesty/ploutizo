import { useCallback, useMemo, useState } from 'react';
import { toast } from '@ploutizo/ui/components/sonner';
import { resolveFixedMtdOverviewRange } from '@ploutizo/utils/dashboard-period';
import type { OrgMember } from '@ploutizo/types';
import type { PayToward } from '@/components/dashboard/settleFormSchema';
import type { CardBalanceRowViewModel } from '@/components/dashboard/card-balances/buildCardBalanceViewModels';
import type { CardBalancesSettleClickHandler } from '@/components/dashboard/card-balances/types';
import { buildCardBalanceViewModels } from '@/components/dashboard/card-balances/buildCardBalanceViewModels';
import { useGetHouseholdMembers } from '@/lib/data-access/household';
import { useGetDashboardOverview } from '@/lib/data-access/dashboard';
import { useGetSettlements } from '@/lib/data-access/settlements';
import { selectCreditCardAccounts } from '@/lib/settlements';
import { CardBalancesGrid } from '@/components/dashboard/card-balances/CardBalancesGrid';
import { SpendTrendCard } from '@/components/dashboard/spend-trend/SpendTrendCard';
import { DashboardHeader } from './DashboardHeader';
import { SettleDialog } from './SettleDialog';
import { SettlementSummaryPane } from './SettlementSummaryPane';

const NO_MEMBERS: OrgMember[] = [];

// All queries fire at top level — no waterfalls (vercel-react-best-practices).
export const Dashboard = () => {
  const overviewRange = useMemo(() => resolveFixedMtdOverviewRange(), []);
  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    isFetching: overviewFetching,
    refetch: refetchOverview,
  } = useGetDashboardOverview(overviewRange);
  const {
    data: settlements,
    isLoading: settlementsLoading,
    isError: settlementsError,
    isFetching: settlementsFetching,
    refetch: refetchSettlements,
  } = useGetSettlements();
  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
    isFetching: membersFetching,
    refetch: refetchMembers,
  } = useGetHouseholdMembers();

  const members = membersData ?? NO_MEMBERS;
  const isRefreshing =
    settlementsFetching || membersFetching || overviewFetching;
  const overviewLoadFailure = overviewError && overview === undefined;
  const overviewLoadingState =
    overviewLoading || (overviewLoadFailure && overviewFetching);

  // Both live cards read the same two queries, so they share loading and error state.
  // A failed refetch keeps cached data on screen; only a failed first load replaces the cards.
  const hasLoadFailure =
    (settlementsError && settlements === undefined) ||
    (membersError && membersData === undefined);
  // Refreshing after a failed first load shows skeletons until it settles.
  const liveSectionsLoading =
    settlementsLoading || membersLoading || (hasLoadFailure && isRefreshing);
  const liveSectionsError = hasLoadFailure && !isRefreshing;

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

  const handleRefresh = useCallback(() => {
    void Promise.all([
      refetchOverview(),
      refetchSettlements(),
      refetchMembers(),
    ]).then((results) => {
      // A failed refetch keeps cached data on screen, so flag it as out of date.
      if (results.some((r) => r.isError && r.data !== undefined)) {
        toast.error('Refresh failed.', {
          description: 'Balances may be out of date.',
        });
      }
    });
  }, [refetchOverview, refetchSettlements, refetchMembers]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        onRefresh={handleRefresh}
        isRefreshing={
          isRefreshing || liveSectionsLoading || overviewLoadingState
        }
      />

      {/*
        Container query, not a viewport breakpoint: cards must also reflow when
        the sidebar opens or closes, which only changes the available width.
      */}
      <div className="@container/dashboard space-y-4">
        <SpendTrendCard
          data={overview}
          isLoading={overviewLoadingState}
          isFetching={overviewFetching}
          isError={overviewLoadFailure && !overviewFetching}
        />
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
              isError={liveSectionsError}
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
