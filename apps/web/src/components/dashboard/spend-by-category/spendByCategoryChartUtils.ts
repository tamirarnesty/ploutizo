import type { DashboardOverviewCategoryRow } from '@ploutizo/validators';
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

/**
 * Tooltip rows for one category: this period, plus the prior period when there is one. Each row carries its
 * own dot colour — the category's, faded for the prior period — so the native tooltip rows render as-is.
 */
export const toCategoryTooltipItems = (row: DashboardOverviewCategoryRow) => {
  const colour = `var(--color-${row.colour})`;
  return [
    {
      name: 'This period',
      dataKey: 'amountCents',
      graphicalItemId: 'amountCents',
      value: row.amountCents,
      color: colour,
      payload: row,
    },
    ...(row.priorAmountCents === null
      ? []
      : [
          {
            name: 'Prior period',
            dataKey: 'priorAmountCents',
            graphicalItemId: 'priorAmountCents',
            value: row.priorAmountCents,
            color: `color-mix(in oklab, ${colour} 40%, transparent)`,
            payload: row,
          },
        ]),
  ];
};
