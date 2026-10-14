import type { TransactionType } from '@ploutizo/types';

/**
 * Signed cents for list footer aggregates (PLO-131). Transfers net to zero
 * across accounts; other types follow the amount column sign convention.
 */
export const listAggregateSignedAmountCents = (
  type: TransactionType,
  amountCents: number
): number => {
  if (type === 'expense') return -amountCents;
  if (type === 'transfer') return 0;
  return amountCents;
};

export type TransactionAmountDisplay =
  | { kind: 'signed'; signedCents: number }
  | { kind: 'unsigned'; amountCents: number };

/** How a row amount should render in the transactions table amount column. */
export const transactionAmountDisplay = (
  type: TransactionType,
  amountCents: number
): TransactionAmountDisplay => {
  if (type === 'expense') {
    return { kind: 'signed', signedCents: -amountCents };
  }
  if (type === 'income' || type === 'refund') {
    return { kind: 'signed', signedCents: amountCents };
  }
  return { kind: 'unsigned', amountCents };
};
