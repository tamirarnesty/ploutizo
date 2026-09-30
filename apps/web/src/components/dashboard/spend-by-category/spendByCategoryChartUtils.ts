import type { DashboardOverviewCategoryRow } from '@ploutizo/validators';
import { colourTokenVar } from '@/components/colour/colour-token-style';
import { formatWholeCurrency } from '@/components/dashboard/dashboardFormat';

const shareFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 0,
});

export const formatCategoryShare = (shareOfPeriod: number): string =>
  shareFormatter.format(shareOfPeriod);

export const formatCategoryChangeVsPrior = (
  amountCents: number,
  priorAmountCents: number | null
): string | null => {
  if (priorAmountCents === null) {
    return null;
  }
  const delta = amountCents - priorAmountCents;
  if (delta === 0) {
    return 'No change vs prior';
  }
  const formatted = formatWholeCurrency(Math.abs(delta));
  return delta > 0 ? `+${formatted} vs prior` : `−${formatted} vs prior`;
};

/** One bar group: this period's amount and, when the overview has a prior window, the prior period's. */
export type SpendByCategoryChartRow = {
  /** Stable axis key: the category id, or the synthetic row's kind. */
  key: string;
  label: string;
  /** Paint for this period's bar only; the tooltip and legend take their colours from the series. */
  barFill: string;
  current: number;
  prior: number | null;
  shareOfPeriod: number;
};

/**
 * The aggregate row is a solid neutral from the theme, never a palette colour a category could also use.
 * Uncategorised is the same neutral, hatched, so the two synthetic rows read as neutral yet stay distinct.
 */
const OTHER_BAR_FILL = 'var(--muted-foreground)';

const displayFor = (
  row: DashboardOverviewCategoryRow,
  uncategorisedFill: string
): Pick<SpendByCategoryChartRow, 'key' | 'label' | 'barFill'> => {
  switch (row.kind) {
    case 'category':
      return {
        key: row.categoryId,
        label: row.name,
        barFill: colourTokenVar(row.colour),
      };
    case 'other':
      return {
        key: 'other',
        label: 'All other categories',
        barFill: OTHER_BAR_FILL,
      };
    case 'uncategorised':
      return {
        key: 'uncategorised',
        label: 'Uncategorised',
        barFill: uncategorisedFill,
      };
  }
};

/** `uncategorisedFill` is the chart's hatch pattern, e.g. `url(#id)`, whose id only the chart knows. */
export const toSpendByCategoryChartRows = (
  rows: DashboardOverviewCategoryRow[],
  uncategorisedFill: string
): SpendByCategoryChartRow[] =>
  rows.map((row) => ({
    ...displayFor(row, uncategorisedFill),
    current: row.amountCents,
    prior: row.priorAmountCents,
    shareOfPeriod: row.shareOfPeriod,
  }));

/** The tooltip subtitle: the row's share of spend and, when there is a prior window, its change. */
export const formatCategorySummary = (row: SpendByCategoryChartRow): string =>
  [
    `${formatCategoryShare(row.shareOfPeriod)} of spend`,
    formatCategoryChangeVsPrior(row.current, row.prior),
  ]
    .filter(Boolean)
    .join(' · ');
