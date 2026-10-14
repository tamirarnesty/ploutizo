import { TRANSACTION_TYPE_VALUES } from '@ploutizo/types';
import { describe, expect, it } from 'vitest';
import {
  listAggregateSignedAmountCents,
  transactionAmountDisplay,
} from './transaction-list-amount';

describe('listAggregateSignedAmountCents', () => {
  it('matches the list SQL sign rule for every transaction type', () => {
    const amount = 12_345;
    for (const type of TRANSACTION_TYPE_VALUES) {
      const signed = listAggregateSignedAmountCents(type, amount);
      if (type === 'expense') expect(signed).toBe(-amount);
      else if (type === 'transfer') expect(signed).toBe(0);
      else expect(signed).toBe(amount);
    }
  });
});

describe('transactionAmountDisplay', () => {
  it('uses signed formatting for expense, income, and refund', () => {
    expect(transactionAmountDisplay('expense', 500)).toEqual({
      kind: 'signed',
      signedCents: -500,
    });
    expect(transactionAmountDisplay('income', 500)).toEqual({
      kind: 'signed',
      signedCents: 500,
    });
    expect(transactionAmountDisplay('refund', 500)).toEqual({
      kind: 'signed',
      signedCents: 500,
    });
  });

  it('uses unsigned formatting for transfer, settlement, and contribution', () => {
    for (const type of ['transfer', 'settlement', 'contribution'] as const) {
      expect(transactionAmountDisplay(type, 500)).toEqual({
        kind: 'unsigned',
        amountCents: 500,
      });
    }
  });
});
