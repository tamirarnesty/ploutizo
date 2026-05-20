import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateTransaction } from '../services/transactions';
import {
  enrichTransactions,
  fetchTransactionById,
  replaceAssignees,
  replaceTags,
  updateTransactionScalarsQuery,
} from '../lib/queries/transactions';

const TXN_ID = '550e8400-e29b-41d4-a716-446655440010';
const ORG_ID = 'org_test123';
const ACCOUNT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const MEMBER_A = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const MEMBER_B = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';

const baseTxRow = {
  id: TXN_ID,
  orgId: ORG_ID,
  type: 'expense' as const,
  amount: 5000,
  date: '2026-01-15',
  accountId: ACCOUNT_ID,
  description: 'Groceries',
};

const expensePayload = {
  type: 'expense' as const,
  accountId: ACCOUNT_ID,
  amount: 5000,
  date: '2026-01-15',
  description: 'Groceries',
};

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(
      async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
        fn({})
    ),
  },
}));

vi.mock('../lib/queries/transactions', () => ({
  fetchTransactionById: vi.fn(),
  enrichTransactions: vi.fn(),
  updateTransactionScalarsQuery: vi.fn(),
  replaceAssignees: vi.fn(),
  replaceTags: vi.fn(),
}));

describe('updateTransaction — PATCH split-sum validation', () => {
  beforeEach(() => {
    vi.mocked(fetchTransactionById).mockReset();
    vi.mocked(enrichTransactions).mockReset();
    vi.mocked(updateTransactionScalarsQuery).mockReset();
    vi.mocked(replaceAssignees).mockReset();
    vi.mocked(replaceTags).mockReset();

    vi.mocked(fetchTransactionById).mockResolvedValue(baseTxRow as never);
    vi.mocked(updateTransactionScalarsQuery).mockResolvedValue({
      ...baseTxRow,
      amount: 6000,
    } as never);
  });

  it('rejects amount-only PATCH when persisted assignees no longer sum to new amount', async () => {
    vi.mocked(enrichTransactions).mockResolvedValue({
      assigneeMap: {
        [TXN_ID]: [
          { memberId: MEMBER_A, amountCents: 3000 },
          { memberId: MEMBER_B, amountCents: 2000 },
        ],
      },
      tagMap: { [TXN_ID]: [] },
    });

    await expect(
      updateTransaction(TXN_ID, ORG_ID, {
        ...expensePayload,
        amount: 6000,
      })
    ).rejects.toThrow('Assignee amounts must sum to transaction amount');

    expect(updateTransactionScalarsQuery).not.toHaveBeenCalled();
    expect(replaceAssignees).not.toHaveBeenCalled();
  });

  it('allows amount-only PATCH when persisted assignees sum to new amount', async () => {
    vi.mocked(enrichTransactions).mockResolvedValue({
      assigneeMap: {
        [TXN_ID]: [
          { memberId: MEMBER_A, amountCents: 3600 },
          { memberId: MEMBER_B, amountCents: 2400 },
        ],
      },
      tagMap: { [TXN_ID]: [] },
    });

    const result = await updateTransaction(TXN_ID, ORG_ID, {
      ...expensePayload,
      amount: 6000,
    });

    expect(result).toMatchObject({ amount: 6000 });
    expect(updateTransactionScalarsQuery).toHaveBeenCalled();
    expect(replaceAssignees).not.toHaveBeenCalled();
  });

  it('validates payload assignees when provided on PATCH', async () => {
    vi.mocked(enrichTransactions).mockResolvedValue({
      assigneeMap: {
        [TXN_ID]: [{ memberId: MEMBER_A, amountCents: 5000 }],
      },
      tagMap: { [TXN_ID]: [] },
    });

    await expect(
      updateTransaction(TXN_ID, ORG_ID, {
        ...expensePayload,
        amount: 5000,
        assignees: [
          { memberId: MEMBER_A, amountCents: 3000 },
          { memberId: MEMBER_B, amountCents: 3000 },
        ],
      })
    ).rejects.toThrow('Assignee amounts must sum to transaction amount');

    expect(updateTransactionScalarsQuery).not.toHaveBeenCalled();
  });

  it('replaces assignees after successful split validation', async () => {
    vi.mocked(enrichTransactions).mockResolvedValue({
      assigneeMap: {
        [TXN_ID]: [{ memberId: MEMBER_A, amountCents: 5000 }],
      },
      tagMap: { [TXN_ID]: [] },
    });

    const newAssignees = [
      { memberId: MEMBER_A, amountCents: 3000 },
      { memberId: MEMBER_B, amountCents: 2000 },
    ];

    await updateTransaction(TXN_ID, ORG_ID, {
      ...expensePayload,
      assignees: newAssignees,
    });

    expect(updateTransactionScalarsQuery).toHaveBeenCalled();
    expect(replaceAssignees).toHaveBeenCalledWith(
      expect.anything(),
      TXN_ID,
      newAssignees
    );
  });

  it('returns null when transaction is not found before validation', async () => {
    vi.mocked(fetchTransactionById).mockResolvedValueOnce(null as never);

    const result = await updateTransaction(TXN_ID, ORG_ID, expensePayload);

    expect(result).toBeNull();
    expect(enrichTransactions).not.toHaveBeenCalled();
    expect(updateTransactionScalarsQuery).not.toHaveBeenCalled();
  });
});
