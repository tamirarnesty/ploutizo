import { formatCurrency } from '@ploutizo/utils/currency';

/** Currency to the cent, for tooltips and deltas where small amounts must stay visible. */
export const formatPreciseCurrency = (amountCents: number): string =>
  formatCurrency(amountCents);

/** Whole-dollar currency for dashboard chart axes, tooltips and deltas. */
export const formatWholeCurrency = (amountCents: number): string =>
  formatCurrency(amountCents, undefined, undefined, {
    maximumFractionDigits: 0,
  });
