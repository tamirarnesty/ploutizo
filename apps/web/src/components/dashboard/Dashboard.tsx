import { useCallback, useMemo, useState } from 'react';
import { Text } from '@ploutizo/ui/components/text';
import type { SettlementAccountRow } from '@ploutizo/types';
import type {
  CardBalancesSettleClickHandler,
  PayTowardTarget,
} from '@/components/dashboard/card-balances/types';
import { formatCurrency } from '@/lib/formatCurrency';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { useGetSettlements } from '@/lib/data-access/settlements';
import { formatDashboardTitle } from '@/components/dashboard/dashboardPeriod';
import { useDashboardEffectivePeriod } from '@/components/dashboard/useDashboardEffectivePeriod';
import { SettleDialog } from './SettleDialog';
import { CardBalancesGrid } from './CardBalancesGrid';
import { PeriodRangePicker } from './PeriodRangePicker';
import { SettlementSummaryPane } from './SettlementSummaryPane';
import { StatCardPlaceholder } from './StatCardPlaceholder';

// Phase 4.2 Dashboard — D-01 (3 ghost stat cards + 1 live CREDIT CARD OWED),
// D-08/D-09/D-10/D-11/D-12/D-18/D-20 (CardBalancesGrid + SettleDialog).
// All queries fire at top level — no waterfalls (vercel-react-best-practices).
export const Dashboard = () => {
  const { data: settlements, isLoading: settlementsLoading } =
    useGetSettlements();
  const { data: members = [] } = useGetOrgMembers();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeAccount, setActiveAccount] =
    useState<SettlementAccountRow | null>(null);
  const [dialogPayToward, setDialogPayToward] =
    useState<PayTowardTarget | null>(null);

  // account.type === 'credit_card' — confirmed per packages/db/src/schema/enums.ts.
  // Filter to credit-card accounts for the Card Balances grid (UI-SPEC + Phase 4.1 D-09).
  const creditCardAccounts = useMemo(
    () =>
      (settlements?.accounts ?? []).filter(
        (a) => a.account.type === 'credit_card'
      ),
    [settlements?.accounts]
  );

  const totalCreditCardOwedCents = useMemo(
    () => creditCardAccounts.reduce((sum, a) => sum + a.totalBalanceCents, 0),
    [creditCardAccounts]
  );

  const handleSettleClick = useCallback<CardBalancesSettleClickHandler>(
    (account, target) => {
      setActiveAccount(account);
      setDialogPayToward(target);
      setDialogOpen(true);
    },
    []
  );

  const handleClose = useCallback(() => {
    setDialogOpen(false);
    setActiveAccount(null);
    setDialogPayToward(null);
  }, []);

  const period = useDashboardEffectivePeriod();
  const periodTitle = formatDashboardTitle(period.from, period.to);

  return (
    <div className="space-y-6">
      {/* Page header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Text as="h1" variant="h2" className="min-w-0 truncate">
            {periodTitle}
          </Text>
          <Text variant="caption" className="text-muted-foreground">
            {`Family overview · ${members.length} member${members.length === 1 ? '' : 's'}`}
          </Text>
        </div>
        <div className="shrink-0">
          <PeriodRangePicker />
        </div>
      </div>

      {/* Stat cards row — 4 cards desktop, 2-col grid on small screens */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCardPlaceholder label="NET BALANCE" />
        <StatCardPlaceholder label="TOTAL INCOME" />
        <StatCardPlaceholder label="TOTAL EXPENSES" />
        <StatCardPlaceholder
          label="CREDIT CARD OWED"
          value={formatCurrency(totalCreditCardOwedCents)}
          caption={`${creditCardAccounts.length} card${creditCardAccounts.length === 1 ? '' : 's'} total`}
        />
      </div>

      {/* Same 4-col grid as stat cards: Card Balances spans 3 cols, Settlement 1 col */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="min-w-0 md:col-span-3">
          <CardBalancesGrid
            accounts={creditCardAccounts}
            isLoading={settlementsLoading}
            onSettleClick={handleSettleClick}
          />
        </div>
        <div className="min-w-0 md:col-span-1">
          <SettlementSummaryPane />
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
