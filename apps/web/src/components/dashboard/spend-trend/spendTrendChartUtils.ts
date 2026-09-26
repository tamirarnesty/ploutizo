import { formatCurrency } from '@ploutizo/utils/currency';

export type SpendTrendChartPoint = {
  bucketStart: string;
  current: number;
  prior: number | null;
};

export const spendTrendHasPriorSeries = (
  data: SpendTrendChartPoint[]
): boolean => data.some((point) => point.prior !== null);

export const spendTrendYDomain = (
  data: SpendTrendChartPoint[]
): [number, number] => {
  const values = data.flatMap((point) =>
    [point.current, point.prior ?? 0].filter((value) => Number.isFinite(value))
  );
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  if (min === max) {
    return [min - 1, max + 1];
  }
  return [min, max];
};

export const formatTrendCurrency = (amountCents: number): string =>
  formatCurrency(amountCents, undefined, undefined, {
    maximumFractionDigits: 0,
  });
