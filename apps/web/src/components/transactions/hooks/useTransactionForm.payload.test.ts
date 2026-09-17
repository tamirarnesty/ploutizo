import { describe, expect, it } from 'vitest';
import { createTransactionSchema } from '@ploutizo/validators';
import { toApiPayload } from './useTransactionForm';
import type { TransactionFormValues } from '../types';

const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440000';
const COUNTERPART_ID = '550e8400-e29b-41d4-a716-446655440002';
const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440099';
const MEMBER_ID = '550e8400-e29b-41d4-a716-446655440003';

const expenseBase = (): TransactionFormValues => ({
  type: 'expense',
  accountId: ACCOUNT_ID,
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

const withAssignee = (value: TransactionFormValues): TransactionFormValues => ({
  ...value,
  assignees: [{ memberId: MEMBER_ID, amountCents: 5000, percentage: 100 }],
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

  it('rounds dollar amounts to integer cents', () => {
    const value = expenseBase();
    value.amount = 12.345;
    const payload = toApiPayload(value);
    expect(payload.amount).toBe(1235);
  });

  it('maps non-empty assignees to API rows', () => {
    const payload = toApiPayload(withAssignee(expenseBase()));
    expect(payload.assignees).toEqual([
      {
        memberId: MEMBER_ID,
        amountCents: 5000,
        percentage: 100,
      },
    ]);
  });

  it('includes only expense-relevant scalars and omits leftover counterpart', () => {
    const value = expenseBase();
    value.categoryId = CATEGORY_ID;
    value.counterpartAccountId = COUNTERPART_ID;
    value.incomeType = 'cash';
    const payload = toApiPayload(value);
    expect(payload).toMatchObject({
      type: 'expense',
      categoryId: CATEGORY_ID,
    });
    expect(payload).not.toHaveProperty('counterpartAccountId');
    expect(payload).not.toHaveProperty('incomeType');
    expect(payload).not.toHaveProperty('refundOf');
  });

  it('includes only transfer-relevant account slots and omits leftover category', () => {
    const value = expenseBase();
    value.type = 'transfer';
    value.counterpartAccountId = COUNTERPART_ID;
    value.categoryId = CATEGORY_ID;
    const payload = toApiPayload(value);
    expect(payload).toMatchObject({
      type: 'transfer',
      counterpartAccountId: COUNTERPART_ID,
    });
    expect(payload).not.toHaveProperty('categoryId');
    expect(payload).not.toHaveProperty('incomeType');
    expect(payload).not.toHaveProperty('refundOf');
  });

  it('preserves settlement Bill Payment categoryId on write', () => {
    const value = expenseBase();
    value.type = 'settlement';
    value.counterpartAccountId = COUNTERPART_ID;
    value.categoryId = CATEGORY_ID;
    const payload = toApiPayload(value);
    expect(payload).toMatchObject({
      type: 'settlement',
      counterpartAccountId: COUNTERPART_ID,
      categoryId: CATEGORY_ID,
    });
    expect(payload).not.toHaveProperty('incomeType');
    expect(payload).not.toHaveProperty('refundOf');
  });

  it('includes contribution counterpart and omits categoryId', () => {
    const value = expenseBase();
    value.type = 'contribution';
    value.counterpartAccountId = COUNTERPART_ID;
    value.categoryId = CATEGORY_ID;
    const payload = toApiPayload(value);
    expect(payload).toMatchObject({
      type: 'contribution',
      counterpartAccountId: COUNTERPART_ID,
    });
    expect(payload).not.toHaveProperty('categoryId');
  });
});

describe('toApiPayload + createTransactionSchema', () => {
  it('requires categoryId for expense and refund payloads', () => {
    const expense = withAssignee({
      ...expenseBase(),
      categoryId: '',
    });
    const refund = withAssignee({
      ...expenseBase(),
      type: 'refund',
      categoryId: '',
    });

    expect(
      createTransactionSchema.safeParse(toApiPayload(expense)).success
    ).toBe(false);
    expect(
      createTransactionSchema.safeParse(toApiPayload(refund)).success
    ).toBe(false);
    expect(
      createTransactionSchema.safeParse(
        toApiPayload(
          withAssignee({ ...expenseBase(), categoryId: CATEGORY_ID })
        )
      ).success
    ).toBe(true);
  });

  it('requires counterpartAccountId for settlement and contribution payloads', () => {
    const settlement = withAssignee({
      ...expenseBase(),
      type: 'settlement',
    });
    const contribution = withAssignee({
      ...expenseBase(),
      type: 'contribution',
    });

    expect(
      createTransactionSchema.safeParse(toApiPayload(settlement)).success
    ).toBe(false);
    expect(
      createTransactionSchema.safeParse(toApiPayload(contribution)).success
    ).toBe(false);
    expect(
      createTransactionSchema.safeParse(
        toApiPayload(
          withAssignee({
            ...expenseBase(),
            type: 'settlement',
            counterpartAccountId: COUNTERPART_ID,
          })
        )
      ).success
    ).toBe(true);
    expect(
      createTransactionSchema.safeParse(
        toApiPayload(
          withAssignee({
            ...expenseBase(),
            type: 'contribution',
            counterpartAccountId: COUNTERPART_ID,
          })
        )
      ).success
    ).toBe(true);
  });
});
