import { describe, expect, it } from 'vitest';
import { toApiPayload } from './useTransactionForm';
import type { TransactionFormValues } from '../types';

const expenseBase = (): TransactionFormValues => ({
  type: 'expense',
  accountId: '550e8400-e29b-41d4-a716-446655440000',
  amount: 50,
  date: '2026-01-15',
  description: 'Coffee',
  tagIds: [],
  categoryId: '',
  refundOf: '',
  incomeType: '',
  counterpartAccountId: '',
  notes: '',
  assignees: [],
});

describe('toApiPayload', () => {
  it('sends empty assignees as [] so PATCH clears splits (not undefined skip)', () => {
    const payload = toApiPayload(expenseBase());
    expect(payload.assignees).toEqual([]);
  });

  it('sends empty tagIds as [] so PATCH clears tags', () => {
    const payload = toApiPayload(expenseBase());
    expect(payload.tagIds).toEqual([]);
  });

  it('maps non-empty assignees to API rows', () => {
    const value = expenseBase();
    value.assignees = [
      {
        memberId: '550e8400-e29b-41d4-a716-446655440003',
        amountCents: 5000,
        percentage: 100,
      },
    ];
    const payload = toApiPayload(value);
    expect(payload.assignees).toEqual([
      {
        memberId: '550e8400-e29b-41d4-a716-446655440003',
        amountCents: 5000,
        percentage: 100,
      },
    ]);
  });
});
