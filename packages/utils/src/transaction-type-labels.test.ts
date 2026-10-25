import { describe, expect, it } from 'vitest';
import { formatTransactionTypeLabel } from './transaction-type-labels';

describe('formatTransactionTypeLabel', () => {
  it('falls back to the raw type for unknown values', () => {
    expect(formatTransactionTypeLabel('custom_type')).toBe('custom_type');
  });
});
