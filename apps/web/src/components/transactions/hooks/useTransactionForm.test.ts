import { describe, expect, it } from 'vitest';
import { toApiPayload } from './useTransactionForm';
import type { TransactionFormValues } from '../types';

const baseForm = (): TransactionFormValues => ({
  type: 'expense',
  accountId: '00000000-0000-4000-8000-000000000001',
  amount: 10,
  date: '2026-01-15',
  description: 'Test',
  tagIds: [],
  categoryId: '',
  refundOf: '',
  incomeType: '',
  counterpartAccountId: '',
  notes: '',
  assignees: [],
});

describe('toApiPayload', () => {
  it('sends assignees as an empty array when there are no splits', () => {
    const payload = toApiPayload(baseForm());
    expect(payload.assignees).toEqual([]);
  });

  it('maps non-empty assignees including percentage', () => {
    const payload = toApiPayload({
      ...baseForm(),
      assignees: [
        {
          memberId: '00000000-0000-4000-8000-000000000002',
          amountCents: 1000,
          percentage: 100,
        },
      ],
    });
    expect(payload.assignees).toEqual([
      {
        memberId: '00000000-0000-4000-8000-000000000002',
        amountCents: 1000,
        percentage: 100,
      },
    ]);
  });
});
