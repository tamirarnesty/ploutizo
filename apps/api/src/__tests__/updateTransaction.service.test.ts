import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@ploutizo/db';
import { DomainError, NotFoundError } from '@/lib/errors';
import { restoreTransaction, updateTransaction } from '@/services/transactions';
import {
  enrichTransactions,
  fetchTransactionById,
  replaceAssignees,
  replaceTags,
  restoreTransactionQuery,
  updateTransactionScalarsQuery,
} from '@/lib/queries/transactions';

const TXN_ID = '550e8400-e29b-41d4-a716-446655440010';
const ORG_ID = 'org_test123';
const ACCOUNT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const MEMBER_A = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const MEMBER_B = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';

const CATEGORY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';

const mockTx = { __mockTx: true as const };

const baseTxRow = {
  id: TXN_ID,
  orgId: ORG_ID,
  type: 'expense' as const,
  amount: 5000,
  date: '2026-01-15',
  accountId: ACCOUNT_ID,
  description: 'Groceries',
  categoryId: CATEGORY_ID,
};

const expensePayload = {
  type: 'expense' as const,
  accountId: ACCOUNT_ID,
  amount: 5000,
  date: '2026-01-15',
  description: 'Groceries',
  categoryId: CATEGORY_ID,
  assignees: [
    { memberId: MEMBER_A, amountCents: 3000, percentage: 60 },
    { memberId: MEMBER_B, amountCents: 2000, percentage: 40 },
  ],
};

const amountOnlyPayload = {
  type: 'expense' as const,
  accountId: ACCOUNT_ID,
  amount: 5000,
  date: '2026-01-15',
  description: 'Groceries',
  categoryId: CATEGORY_ID,
};

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    ),
  },
}));

vi.mock('@/lib/queries/transactions', () => ({
  fetchTransactionById: vi.fn(),
  enrichTransactions: vi.fn(),
  updateTransactionScalarsQuery: vi.fn(),
  replaceAssignees: vi.fn(),
  replaceTags: vi.fn(),
  restoreTransactionQuery: vi.fn(),
}));

vi.mock('@/lib/queries/scope', () => ({
  fetchAccountWriteReference: vi.fn().mockResolvedValue({
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    type: 'chequing',
  }),
  allMembersInOrg: vi.fn().mockResolvedValue(true),
  allTagsInOrg: vi.fn().mockResolvedValue(true),
  categoryExistsInOrg: vi.fn().mockResolvedValue(true),
  transactionExistsInOrg: vi.fn().mockResolvedValue(true),
}));

const expectTxConsistentReads = () => {
  expect(fetchTransactionById).toHaveBeenCalledWith(ORG_ID, TXN_ID, mockTx);
  expect(enrichTransactions).toHaveBeenCalledWith(ORG_ID, [baseTxRow], mockTx);
};

describe('updateTransaction — PATCH split-sum validation', () => {
  beforeEach(() => {
    vi.mocked(db.transaction).mockClear();
    vi.mocked(fetchTransactionById).mockReset();
    vi.mocked(enrichTransactions).mockReset();
    vi.mocked(updateTransactionScalarsQuery).mockReset();
    vi.mocked(replaceAssignees).mockReset();
    vi.mocked(replaceTags).mockReset();
    vi.mocked(restoreTransactionQuery).mockReset();

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
      updateTransaction(ORG_ID, TXN_ID, {
        ...amountOnlyPayload,
        amount: 6000,
      })
    ).rejects.toThrow('Assignee amounts must sum to transaction amount');

    expect(updateTransactionScalarsQuery).not.toHaveBeenCalled();
    expect(replaceAssignees).not.toHaveBeenCalled();
    expectTxConsistentReads();
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

    const result = await updateTransaction(ORG_ID, TXN_ID, {
      ...amountOnlyPayload,
      amount: 6000,
    });

    expect(result).toMatchObject({ amount: 6000 });
    expect(updateTransactionScalarsQuery).toHaveBeenCalled();
    expect(replaceAssignees).not.toHaveBeenCalled();
    expectTxConsistentReads();
  });

  it('validates payload assignees when provided on PATCH without loading persisted rows', async () => {
    await expect(
      updateTransaction(ORG_ID, TXN_ID, {
        ...expensePayload,
        amount: 5000,
        assignees: [
          { memberId: MEMBER_A, amountCents: 3000, percentage: 50 },
          { memberId: MEMBER_B, amountCents: 3000, percentage: 50 },
        ],
      })
    ).rejects.toThrow('Assignee amounts must sum to transaction amount');

    expect(updateTransactionScalarsQuery).not.toHaveBeenCalled();
    expect(fetchTransactionById).toHaveBeenCalledWith(ORG_ID, TXN_ID, mockTx);
    expect(enrichTransactions).not.toHaveBeenCalled();
  });

  it('replaces assignees after successful split validation without loading persisted rows', async () => {
    const newAssignees = [
      { memberId: MEMBER_A, amountCents: 3000, percentage: 60 },
      { memberId: MEMBER_B, amountCents: 2000, percentage: 40 },
    ];

    await updateTransaction(ORG_ID, TXN_ID, {
      ...expensePayload,
      assignees: newAssignees,
    });

    expect(updateTransactionScalarsQuery).toHaveBeenCalled();
    expect(replaceAssignees).toHaveBeenCalledWith(mockTx, TXN_ID, newAssignees);
    expect(fetchTransactionById).toHaveBeenCalledWith(ORG_ID, TXN_ID, mockTx);
    expect(enrichTransactions).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when transaction is not found before validation', async () => {
    vi.mocked(fetchTransactionById).mockResolvedValueOnce(null as never);

    await expect(
      updateTransaction(ORG_ID, TXN_ID, expensePayload)
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(enrichTransactions).not.toHaveBeenCalled();
    expect(updateTransactionScalarsQuery).not.toHaveBeenCalled();
  });

  it('maps an active external-id conflict during update to a domain conflict', async () => {
    vi.mocked(updateTransactionScalarsQuery).mockRejectedValueOnce({
      code: '23505',
      constraint: 'transactions_active_account_external_id_idx',
    });

    const error = await updateTransaction(ORG_ID, TXN_ID, expensePayload).catch(
      (caught: unknown) => caught
    );

    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).statusCode).toBe(409);
    expect((error as DomainError).code).toBe('EXTERNAL_ID_CONFLICT');
  });

  it('maps an active external-id conflict during restore to a domain conflict', async () => {
    vi.mocked(restoreTransactionQuery).mockRejectedValueOnce({
      code: '23505',
      constraint: 'transactions_active_account_external_id_idx',
    });

    const error = await restoreTransaction(ORG_ID, TXN_ID).catch(
      (caught: unknown) => caught
    );

    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).statusCode).toBe(409);
    expect((error as DomainError).code).toBe('EXTERNAL_ID_CONFLICT');
  });
});
