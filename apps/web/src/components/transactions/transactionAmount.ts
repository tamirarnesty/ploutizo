import type { TransactionType } from '@ploutizo/types';

export type TransactionAmountDisplay =
  | { kind: 'signed'; signedCents: number }
  | { kind: 'unsigned'; amountCents: number };

/** How a row amount should render in the transactions table amount column. */
export const transactionAmountDisplay = (
  type: TransactionType,
  amountCents: number
): TransactionAmountDisplay => {
  switch (type) {
    case 'expense':
      return { kind: 'signed', signedCents: -amountCents };
    case 'income':
    case 'refund':
      return { kind: 'signed', signedCents: amountCents };
    case 'transfer':
    case 'settlement':
    case 'contribution':
      return { kind: 'unsigned', amountCents };
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
};

/**
 * Net of the signed amounts in a set of rows (PLO-131 page footer). Unsigned
 * rows (transfers, settlements, contributions) move money within the household
 * and render without a sign, so they do not count.
 */
export const netSignedAmountCents = (
  rows: readonly { type: TransactionType; amount: number }[]
): number =>
  rows.reduce((net, row) => {
    const display = transactionAmountDisplay(row.type, row.amount);
    return display.kind === 'signed' ? net + display.signedCents : net;
  }, 0);
