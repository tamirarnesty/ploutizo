import { Text } from '@ploutizo/ui/components/text';
import { StatCardPlaceholder } from './StatCardPlaceholder';
import { SettlementSummaryPane } from './SettlementSummaryPane';
import { PeriodRangePicker } from './PeriodRangePicker';
import { useGetSettlements } from '@/lib/data-access/settlements';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { formatCurrency } from '@/lib/formatCurrency';

// Phase 4.2 Dashboard shell — D-01 (refined by UI-SPEC: 3 ghost placeholder cards +
// 1 live CREDIT CARD OWED card showing real data), D-02.
// D-01 originally specified "empty stat card placeholders"; the UI-SPEC refined this
// to allow 1 live card for CREDIT CARD OWED with real balance data. The UI-SPEC is the
// authoritative visual contract; this implementation follows it.
//
// Stat cards: 3 ghosts (NET BALANCE / TOTAL INCOME / TOTAL EXPENSES) + 1 live
// (CREDIT CARD OWED). Two-column main row: CardBalancesGrid placeholder slot
// (replaced by Plan 05) + SettlementSummaryPane.
// All queries fire at top level — no waterfalls (vercel-react-best-practices).
export const Dashboard = () => {
  const { data: settlements } = useGetSettlements();
  const { data: members = [] } = useGetOrgMembers();

  // account.type === 'credit_card' — confirmed per packages/db/src/schema/enums.ts
  const totalCreditCardOwedCents = (settlements?.accounts ?? [])
    .filter((a) => a.account.type === 'credit_card')
    .reduce((sum, a) => sum + a.totalBalanceCents, 0);

  const creditCardCount = (settlements?.accounts ?? []).filter(
    (a) => a.account.type === 'credit_card'
  ).length;

  // Page header copy — "March 2026" matches mockup. Do not localize in Phase 4.2.
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
          caption={`${creditCardCount} card${creditCardCount === 1 ? '' : 's'} total`}
        />
      </div>

      {/* Two-column main row: CardBalancesGrid placeholder (left) + SettlementSummaryPane (right) */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="min-w-0 flex-1">
          {/* Plan 05 replaces this slot with <CardBalancesGrid /> */}
          <div
            data-cardbalancesgrid-slot
            className="rounded-lg border border-border bg-card p-6"
          >
            <Text variant="caption" className="text-muted-foreground">
              Card Balances will appear here.
            </Text>
          </div>
        </div>
        <div className="w-full shrink-0 md:w-72">
          <SettlementSummaryPane />
        </div>
      </div>
    </div>
  );
};
