import { formatCurrency } from '@ploutizo/utils/currency';

/** Whole-dollar currency for dashboard chart axes, tooltips and deltas. */
export const formatWholeCurrency = (amountCents: number): string =>
  formatCurrency(amountCents, undefined, undefined, {
    maximumFractionDigits: 0,
  });
