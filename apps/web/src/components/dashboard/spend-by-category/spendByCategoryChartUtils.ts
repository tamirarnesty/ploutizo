import { formatCurrency } from '@ploutizo/utils/currency';
import type { DashboardOverviewCategoryRow } from '@ploutizo/validators';

export type SpendByCategoryChartRow = DashboardOverviewCategoryRow & {
  rowKey: string;
};

export const toSpendByCategoryChartData = (
  categories: DashboardOverviewCategoryRow[]
): SpendByCategoryChartRow[] =>
  categories.map((row) => ({
    ...row,
    rowKey: row.categoryId ?? 'other',
  }));

export const formatCategoryShare = (shareOfPeriod: number): string =>
  new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(shareOfPeriod);

export const formatCategoryAmount = (amountCents: number): string =>
  formatCurrency(amountCents, undefined, undefined, {
    maximumFractionDigits: 0,
  });

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
  const formatted = formatCategoryAmount(Math.abs(delta));
  return delta > 0 ? `+${formatted} vs prior` : `−${formatted} vs prior`;
};

export const hasCategorySpend = (
  categories: DashboardOverviewCategoryRow[]
): boolean => categories.some((row) => row.amountCents > 0);

/**
 * Tooltip rows for one category: this period, plus the prior period when there is one. Each row carries its
 * own dot colour — the category's, faded for the prior period — so the native tooltip rows render as-is.
 */
export const toCategoryTooltipItems = (row: SpendByCategoryChartRow) => {
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
