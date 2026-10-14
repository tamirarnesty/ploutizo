import { describe, expect, it } from 'vitest';
import { netSignedAmountCents } from './transactionAmount';

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
