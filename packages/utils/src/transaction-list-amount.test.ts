import { describe, expect, it } from 'vitest';
import {
  netSignedAmountCents,
  transactionAmountDisplay,
} from './transaction-list-amount';

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

describe('netSignedAmountCents', () => {
  it('nets the signed rows and leaves out internal money movements', () => {
    expect(
      netSignedAmountCents([
        { type: 'expense', amount: 2_500 },
        { type: 'income', amount: 500_000 },
        { type: 'refund', amount: 1_000 },
        { type: 'transfer', amount: 10_000 },
        { type: 'settlement', amount: 7_000 },
        { type: 'contribution', amount: 3_000 },
      ])
    ).toBe(-2_500 + 500_000 + 1_000);
  });

  it('is zero for no rows', () => {
    expect(netSignedAmountCents([])).toBe(0);
  });
});
