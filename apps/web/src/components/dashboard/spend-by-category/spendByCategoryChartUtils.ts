import { formatCurrency } from '@ploutizo/utils/currency';
import type { DashboardOverviewCategoryRow } from '@ploutizo/types';

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
