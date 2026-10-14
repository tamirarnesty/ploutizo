import type { TransactionType } from '@ploutizo/types';

/**
 * Signed cents for list footer aggregates (PLO-131). Transfers net to zero
 * across accounts; other types follow the amount column sign convention.
 */
export const listAggregateSignedAmountCents = (
  type: TransactionType,
  amountCents: number
): number => {
  switch (type) {
    case 'expense':
      return -amountCents;
    case 'transfer':
      return 0;
    case 'income':
    case 'refund':
    case 'settlement':
    case 'contribution':
      return amountCents;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
};

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
