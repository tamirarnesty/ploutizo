import { describe, expect, it } from 'vitest';
import { formatSettlementDescription } from './settlement-description';

describe('formatSettlementDescription', () => {
  it('includes paid-from and card when source account is set', () => {
    expect(
      formatSettlementDescription('TD Visa', 'Tamir WS')
    ).toBe('Settlement from Tamir WS to TD Visa');
  });

  it('falls back to card-only when paid-from is absent', () => {
    expect(formatSettlementDescription('TD Visa')).toBe('Settlement: TD Visa');
    expect(formatSettlementDescription('TD Visa', null)).toBe(
      'Settlement: TD Visa'
    );
  });
});
