import { useState } from 'react';
import { Text } from '@ploutizo/ui/components/text';
import { StatCardPlaceholder } from './StatCardPlaceholder';
import { SettlementSummaryPane } from './SettlementSummaryPane';
import { PeriodRangePicker } from './PeriodRangePicker';
import { CardBalancesGrid } from './CardBalancesGrid';
import { SettleDialog } from './SettleDialog';
import type {
  SettlementAccountRow,
  SettlementMemberRow,
} from '@ploutizo/types';
import { formatCurrency } from '@/lib/formatCurrency';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { useGetSettlements } from '@/lib/data-access/settlements';

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

  // account.type === 'credit_card' — confirmed per packages/db/src/schema/enums.ts.
  // Filter to credit-card accounts for the Card Balances grid (UI-SPEC + Phase 4.1 D-09).
  const creditCardAccounts = (settlements?.accounts ?? []).filter(
    (a) => a.account.type === 'credit_card'
  );

  const totalCreditCardOwedCents = creditCardAccounts.reduce(
    (sum, a) => sum + a.totalBalanceCents,
    0
  );

  const handleSettleClick = (
    account: SettlementAccountRow,
    // _member is passed by CardBalancesGrid but D-11 specifies the dialog handles
    // member pre-selection internally (first member with balance > 0). We ignore
    // the clicked member to keep dialog behaviour consistent with D-11.
    _member: SettlementMemberRow
  ) => {
    setActiveAccount(account);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setActiveAccount(null);
  };

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-CA', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Page header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Text as="h1" variant="h2" className="min-w-0 truncate">
            {monthLabel}
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

      {/* Two-column main row: CardBalancesGrid (left) + SettlementSummaryPane (right) */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="min-w-0 flex-1">
          <CardBalancesGrid
            accounts={creditCardAccounts}
            isLoading={settlementsLoading}
            onSettleClick={handleSettleClick}
          />
        </div>
        <div className="w-full shrink-0 md:w-72">
          <SettlementSummaryPane />
        </div>
      </div>

      <SettleDialog
        open={dialogOpen}
        account={activeAccount}
        onClose={handleClose}
      />
    </div>
  );
};
