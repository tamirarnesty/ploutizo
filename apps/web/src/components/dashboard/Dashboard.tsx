import { useCallback, useMemo, useState } from 'react';
import { toast } from '@ploutizo/ui/components/sonner';
import type { OrgMember } from '@ploutizo/validators';
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
import { SpendByCategoryCard } from '@/components/dashboard/spend-by-category/SpendByCategoryCard';
import { getCombinedDashboardQueryLiveState } from '@/components/dashboard/dashboardQueryLiveState';
import { useDashboardRecentTransactions } from '@/lib/data-access/transactions/dashboardRecentTransactions';
import { DashboardHeader } from './DashboardHeader';
import { useDashboardSearch } from './useDashboardSearch';
import { SettleDialog } from './SettleDialog';
import { SettlementSummaryPane } from './SettlementSummaryPane';
import { RecentTransactionsCard } from './recent-transactions/RecentTransactionsCard';

const NO_MEMBERS: OrgMember[] = [];

// All queries fire at top level — no waterfalls (vercel-react-best-practices).
export const Dashboard = () => {
  const {
    periodSelection,
    period,
    today,
    spendTrendMode,
    selectShortcut,
    applyCustomRange,
    selectSpendTrendMode,
  } = useDashboardSearch();
  const overviewQuery = useGetDashboardOverview(period);
  const { refetch: refetchOverview } = overviewQuery;
  const {
    data: settlements,
    isError: settlementsError,
    isFetching: settlementsFetching,
    isPending: settlementsPending,
    refetch: refetchSettlements,
  } = useGetSettlements();
  const {
    data: membersData,
    isError: membersError,
    isFetching: membersFetching,
    isPending: membersPending,
    refetch: refetchMembers,
  } = useGetHouseholdMembers();
  const recentTransactionsQuery = useDashboardRecentTransactions();
  const {
    isFetching: recentTransactionsFetching,
    refetch: refetchRecentTransactions,
  } = recentTransactionsQuery;

  const members = membersData ?? NO_MEMBERS;
  const isRefreshing =
    settlementsFetching ||
    membersFetching ||
    overviewQuery.isFetching ||
    recentTransactionsFetching;

  const { isBusy: liveSectionsLoading, showError: liveSectionsError } =
    getCombinedDashboardQueryLiveState(
      [
        {
          data: settlements,
          isError: settlementsError,
          isFetching: settlementsFetching,
          isPending: settlementsPending,
        },
        {
          data: membersData,
          isError: membersError,
          isFetching: membersFetching,
          isPending: membersPending,
        },
      ],
      { busyWhileRefetching: false }
    );

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
      refetchRecentTransactions(),
    ]).then((results) => {
      // A failed refetch keeps cached data on screen, so flag it as out of date.
      if (results.some((r) => r.isError && r.data !== undefined)) {
        toast.error('Refresh failed.', {
          description: 'The dashboard may be out of date.',
        });
      }
    });
  }, [
    refetchOverview,
    refetchSettlements,
    refetchMembers,
    refetchRecentTransactions,
  ]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        periodSelection={periodSelection}
        period={period}
        onSelectShortcut={selectShortcut}
        onApplyCustomRange={applyCustomRange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || liveSectionsLoading}
      />

      {/*
        Flex-wrap, not a fixed grid: each card has a preferred width and grows
        into free space, wrapping to the next line when it no longer fits — so
        cards also reflow when the sidebar opens or closes. Cards on the same
        line stretch to equal height.
      */}
      <div className="flex flex-wrap gap-4">
        <SpendTrendCard
          className="min-w-0 flex-[2_1_32rem]"
          query={overviewQuery}
          mode={spendTrendMode}
          onModeChange={selectSpendTrendMode}
          today={today}
        />
        <SpendByCategoryCard
          className="min-w-0 flex-[1_1_20rem]"
          query={overviewQuery}
        />
        <CardBalancesGrid
          className="min-w-0 flex-[3_1_36rem]"
          rows={cardBalanceRows}
          isLoading={liveSectionsLoading}
          isError={liveSectionsError}
          onSettleClick={handleSettleClick}
        />
        <SettlementSummaryPane
          className="min-w-0 flex-[1_1_18rem]"
          accounts={settlements?.accounts}
          isError={liveSectionsError}
          isLoading={liveSectionsLoading}
          members={members}
        />
        <RecentTransactionsCard query={recentTransactionsQuery} />
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
