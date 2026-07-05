import { describe, expect, it } from 'vitest';
import { formatTransactionTypeLabel } from './transaction-type-labels';

describe('formatTransactionTypeLabel', () => {
  it('returns labels for known transaction types', () => {
    expect(formatTransactionTypeLabel('expense')).toBe('Expense');
    expect(formatTransactionTypeLabel('refund')).toBe('Refund');
    expect(formatTransactionTypeLabel('settlement')).toBe('Settlement');
  });

  it('falls back to the raw type for unknown values', () => {
    expect(formatTransactionTypeLabel('custom_type')).toBe('custom_type');
  });
});
