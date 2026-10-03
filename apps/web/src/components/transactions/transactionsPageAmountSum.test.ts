import { describe, expect, it } from 'vitest';
import type { TransactionRow } from '@ploutizo/validators';
import { sumLoadedPageAmountCents } from './transactionsPageAmountSum';

const row = (
  overrides: Partial<Pick<TransactionRow, 'type' | 'amount'>>
): Pick<TransactionRow, 'type' | 'amount'> => ({
  type: 'expense',
  amount: 1000,
  ...overrides,
});

describe('sumLoadedPageAmountCents', () => {
  it('sums only the loaded page using Amount-column signs', () => {
    expect(
      sumLoadedPageAmountCents([
        row({ type: 'expense', amount: 1000 }),
        row({ type: 'income', amount: 2500 }),
        row({ type: 'transfer', amount: -500 }),
      ])
    ).toBe(1000);
  });

  it('includes transfer, settlement, and contribution rows on the page', () => {
    expect(
      sumLoadedPageAmountCents([
        row({ type: 'transfer', amount: -3000 }),
        row({ type: 'settlement', amount: 4000 }),
        row({ type: 'contribution', amount: 1500 }),
      ])
    ).toBe(2500);
  });

  it('returns zero for an empty loaded page', () => {
    expect(sumLoadedPageAmountCents([])).toBe(0);
  });
});
