import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateTransactionInput,
  UpdateTransactionServiceInput,
} from '@ploutizo/validators';
import { DomainError } from '@/lib/errors';
import {
  counterpartAccountBelongsToOrg,
  refundOfExists,
} from '@/lib/queries/transactions';
import {
  SPLIT_SUM_MISMATCH_MESSAGE,
  assertTransactionWriteOrgRefs,
  assigneeRowsForPatchSplitSum,
  planCreateTransactionWrite,
  planUpdateTransactionWrite,
  typeSpecificNullsForWrite,
  validateSplitSum,
} from '@/services/transaction-write-planner';

vi.mock('@/lib/queries/transactions', () => ({
  counterpartAccountBelongsToOrg: vi.fn(),
  refundOfExists: vi.fn(),
}));

const MEMBER_A = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const MEMBER_B = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
const ACCOUNT_A = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ACCOUNT_B = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
const CATEGORY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15';
const REFUND_OF = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16';
const ORG_ID = 'org_test123';

const matchingAssignees = [
  { memberId: MEMBER_A, amountCents: 3000, percentage: 60 },
  { memberId: MEMBER_B, amountCents: 2000, percentage: 40 },
];

describe('validateSplitSum', () => {
  it('accepts matching assignee amounts', () => {
    expect(
      validateSplitSum(5000, [{ amountCents: 3000 }, { amountCents: 2000 }])
    ).toBeNull();
  });

  it('rejects when assignee amounts do not sum to the transaction amount', () => {
    expect(
      validateSplitSum(5000, [{ amountCents: 3000 }, { amountCents: 3000 }])
    ).toBe(SPLIT_SUM_MISMATCH_MESSAGE);
  });

  it('skips the check when assignees are omitted or empty', () => {
    expect(validateSplitSum(5000)).toBeNull();
    expect(validateSplitSum(5000, [])).toBeNull();
  });
});

describe('assigneeRowsForPatchSplitSum', () => {
  const existing = [{ amountCents: 3000 }, { amountCents: 2000 }];

  it('uses payload assignees when provided', () => {
    const rows = assigneeRowsForPatchSplitSum(
      [
        {
          memberId: MEMBER_A,
          amountCents: 5000,
          percentage: 100,
        },
      ],
      existing
    );
    expect(rows).toEqual([{ amountCents: 5000 }]);
  });

  it('uses existing assignees when payload omits assignees', () => {
    const rows = assigneeRowsForPatchSplitSum(undefined, existing);
    expect(rows).toEqual([{ amountCents: 3000 }, { amountCents: 2000 }]);
  });

  it('returns null when no assignee rows apply', () => {
    expect(assigneeRowsForPatchSplitSum(undefined, [])).toBeNull();
    expect(assigneeRowsForPatchSplitSum([], [])).toBeNull();
  });
});

describe('typeSpecificNullsForWrite', () => {
  it('nulls counterpart, refund, and income fields for expense (keeps category)', () => {
    expect(typeSpecificNullsForWrite('expense')).toEqual({
      counterpartAccountId: null,
      refundOf: null,
      incomeType: null,
    });
  });

  it('nulls counterpart and income fields for refund (keeps refundOf and category)', () => {
    expect(typeSpecificNullsForWrite('refund')).toEqual({
      counterpartAccountId: null,
      incomeType: null,
    });
  });

  it('nulls counterpart, refund, and category for income (keeps incomeType)', () => {
    expect(typeSpecificNullsForWrite('income')).toEqual({
      counterpartAccountId: null,
      refundOf: null,
      categoryId: null,
    });
  });

  it('nulls refund, income, and category for transfer (keeps counterpart)', () => {
    expect(typeSpecificNullsForWrite('transfer')).toEqual({
      refundOf: null,
      incomeType: null,
      categoryId: null,
    });
  });

  it('nulls refund and income for settlement (keeps counterpart and Bill Payment category)', () => {
    expect(typeSpecificNullsForWrite('settlement')).toEqual({
      refundOf: null,
      incomeType: null,
    });
  });

  it('nulls refund, income, and category for contribution (keeps counterpart)', () => {
    expect(typeSpecificNullsForWrite('contribution')).toEqual({
      refundOf: null,
      incomeType: null,
      categoryId: null,
    });
  });
});

describe('planCreateTransactionWrite', () => {
  const expenseInput = {
    type: 'expense',
    accountId: ACCOUNT_A,
    amount: 5000,
    date: '2026-01-15',
    description: 'Groceries',
    categoryId: CATEGORY_ID,
    assignees: matchingAssignees,
  } satisfies CreateTransactionInput;

  it('normalizes assignees after a matching split-sum check', () => {
    const plan = planCreateTransactionWrite(expenseInput);

    expect(plan.transactionData).toEqual({
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 5000,
      date: '2026-01-15',
      description: 'Groceries',
      categoryId: CATEGORY_ID,
    });
    expect(plan.normalizedAssignees).toEqual(matchingAssignees);
    expect(plan.tagIds).toBeUndefined();
  });

  it('rejects a split-sum mismatch before returning a plan', () => {
    expect(() =>
      planCreateTransactionWrite({
        ...expenseInput,
        assignees: [
          { memberId: MEMBER_A, amountCents: 3000, percentage: 50 },
          { memberId: MEMBER_B, amountCents: 3000, percentage: 50 },
        ],
      })
    ).toThrow(SPLIT_SUM_MISMATCH_MESSAGE);
  });
});

describe('planUpdateTransactionWrite', () => {
  const expenseUpdate = {
    type: 'expense',
    accountId: ACCOUNT_A,
    amount: 5000,
    date: '2026-01-15',
    description: 'Groceries',
    categoryId: CATEGORY_ID,
    assignees: matchingAssignees,
  } satisfies UpdateTransactionServiceInput;

  it('applies type-specific nulls and accepts a matching payload split', () => {
    const plan = planUpdateTransactionWrite(expenseUpdate, []);

    expect(plan.updateData).toMatchObject({
      type: 'expense',
      counterpartAccountId: null,
      refundOf: null,
      incomeType: null,
    });
    expect(plan.updateData).not.toHaveProperty('categoryId', null);
    expect(plan.normalizedAssignees).toEqual(matchingAssignees);
  });

  it('validates persisted assignees when the payload omits them', () => {
    const { assignees: _omit, ...amountOnly } = expenseUpdate;

    expect(() =>
      planUpdateTransactionWrite({ ...amountOnly, amount: 6000 }, [
        { amountCents: 3000 },
        { amountCents: 2000 },
      ])
    ).toThrow(SPLIT_SUM_MISMATCH_MESSAGE);
  });

  it('keeps Bill Payment category when planning a settlement update', () => {
    const plan = planUpdateTransactionWrite(
      {
        type: 'settlement',
        accountId: ACCOUNT_A,
        counterpartAccountId: ACCOUNT_B,
        amount: 5000,
        date: '2026-01-15',
        description: 'Settlement',
        categoryId: CATEGORY_ID,
        assignees: matchingAssignees,
      },
      []
    );

    expect(plan.updateData).toMatchObject({
      categoryId: CATEGORY_ID,
      refundOf: null,
      incomeType: null,
    });
    expect(plan.updateData).not.toHaveProperty('counterpartAccountId', null);
  });
});

describe('assertTransactionWriteOrgRefs', () => {
  beforeEach(() => {
    vi.mocked(counterpartAccountBelongsToOrg).mockReset();
    vi.mocked(refundOfExists).mockReset();
    vi.mocked(counterpartAccountBelongsToOrg).mockResolvedValue(true);
    vi.mocked(refundOfExists).mockResolvedValue(true);
  });

  it('rejects a counterpart account that is not in the org', async () => {
    vi.mocked(counterpartAccountBelongsToOrg).mockResolvedValue(false);

    const err = await assertTransactionWriteOrgRefs(ORG_ID, {
      type: 'transfer',
      accountId: ACCOUNT_A,
      counterpartAccountId: ACCOUNT_B,
      amount: 5000,
      date: '2026-01-15',
      description: 'Transfer',
      assignees: matchingAssignees,
    }).catch((caught: unknown) => caught);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 400,
      code: 'INVALID_COUNTERPART_ACCOUNT',
      message: 'counterpartAccountId references an account not in this org',
    });
    expect(counterpartAccountBelongsToOrg).toHaveBeenCalledWith(
      ORG_ID,
      ACCOUNT_B
    );
  });

  it('rejects a refundOf transaction that is not in the org', async () => {
    vi.mocked(refundOfExists).mockResolvedValue(false);

    const err = await assertTransactionWriteOrgRefs(ORG_ID, {
      type: 'refund',
      accountId: ACCOUNT_A,
      amount: 5000,
      date: '2026-01-15',
      description: 'Refund',
      categoryId: CATEGORY_ID,
      refundOf: REFUND_OF,
      assignees: matchingAssignees,
    }).catch((caught: unknown) => caught);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 400,
      code: 'INVALID_REFUND_REFERENCE',
      message: 'refundOf transaction not found in this org',
    });
    expect(refundOfExists).toHaveBeenCalledWith(ORG_ID, REFUND_OF);
  });

  it('skips counterpart and refund checks when those fields are absent', async () => {
    await assertTransactionWriteOrgRefs(ORG_ID, {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 5000,
      date: '2026-01-15',
      description: 'Groceries',
      categoryId: CATEGORY_ID,
      assignees: matchingAssignees,
    });

    expect(counterpartAccountBelongsToOrg).not.toHaveBeenCalled();
    expect(refundOfExists).not.toHaveBeenCalled();
  });

  it('accepts in-org counterpart and refund references', async () => {
    await assertTransactionWriteOrgRefs(ORG_ID, {
      type: 'refund',
      accountId: ACCOUNT_A,
      amount: 5000,
      date: '2026-01-15',
      description: 'Refund',
      categoryId: CATEGORY_ID,
      refundOf: REFUND_OF,
      assignees: matchingAssignees,
    });

    await assertTransactionWriteOrgRefs(ORG_ID, {
      type: 'transfer',
      accountId: ACCOUNT_A,
      counterpartAccountId: ACCOUNT_B,
      amount: 5000,
      date: '2026-01-15',
      description: 'Transfer',
      assignees: matchingAssignees,
    });

    expect(refundOfExists).toHaveBeenCalledWith(ORG_ID, REFUND_OF);
    expect(counterpartAccountBelongsToOrg).toHaveBeenCalledWith(
      ORG_ID,
      ACCOUNT_B
    );
  });
});
