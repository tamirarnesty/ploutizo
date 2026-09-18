import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountType } from '@ploutizo/types';
import type { CreateTransactionInput } from '@ploutizo/validators';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  allMembersInOrg,
  allTagsInOrg,
  categoryExistsInOrg,
  fetchAccountWriteReference,
} from '@/lib/queries/scope';
import { createTransaction, updateTransaction } from '@/services/transactions';
import {
  counterpartAccountBelongsToOrg,
  fetchTransactionById,
  refundOfExists,
  updateTransactionScalarsQuery,
} from '@/lib/queries/transactions';

const mockTx = {
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'tx_1' }]),
    }),
  }),
};

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    ),
  },
}));

vi.mock('@/lib/queries/transactions', () => ({
  enrichTransactions: vi.fn(),
  fetchTransactionById: vi.fn(),
  updateTransactionScalarsQuery: vi.fn(),
  replaceAssignees: vi.fn(),
  replaceTags: vi.fn(),
  buildListQuery: vi.fn(),
  countQuery: vi.fn(),
  counterpartAccountBelongsToOrg: vi.fn().mockResolvedValue(true),
  refundOfExists: vi.fn().mockResolvedValue(true),
  softDeleteTransactionQuery: vi.fn(),
  restoreTransactionQuery: vi.fn(),
}));

vi.mock('@/lib/queries/scope', () => ({
  fetchAccountWriteReference: vi.fn(),
  allMembersInOrg: vi.fn(),
  allTagsInOrg: vi.fn(),
  categoryExistsInOrg: vi.fn(),
  transactionExistsInOrg: vi.fn(),
}));

vi.mock('@/lib/queries/imports', () => ({
  fetchImportBatchInOrg: vi.fn(),
}));

const ORG_A = 'org_a';
const ACCOUNT_A = '550e8400-e29b-41d4-a716-446655440010';
const ACCOUNT_B = '550e8400-e29b-41d4-a716-446655440011';
const MEMBER_A = '550e8400-e29b-41d4-a716-446655440020';

const accountRef = (
  id: string,
  type: AccountType,
  archivedAt: Date | null = null
) => ({ id, type, archivedAt });

const baseAssignees = [
  { memberId: MEMBER_A, amountCents: 1000, percentage: 100 },
];

const mockAccountLookups = (
  refs: Record<string, ReturnType<typeof accountRef> | null>
) => {
  vi.mocked(fetchAccountWriteReference).mockImplementation(
    (_orgId, accountId) => Promise.resolve(refs[accountId] ?? null)
  );
};

describe('createTransaction — cross-org reference rejection', () => {
  beforeEach(() => {
    vi.mocked(fetchAccountWriteReference).mockReset();
    vi.mocked(allMembersInOrg).mockReset();
    vi.mocked(allTagsInOrg).mockReset();
    vi.mocked(categoryExistsInOrg).mockReset();
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'chequing'),
    });
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
    vi.mocked(allTagsInOrg).mockResolvedValue(true);
    vi.mocked(categoryExistsInOrg).mockResolvedValue(true);
  });

  it('rejects primary accountId not in org (two-org isolation)', async () => {
    mockAccountLookups({ [ACCOUNT_A]: null });

    const err = await createTransaction(ORG_A, {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Test',
      categoryId: '550e8400-e29b-41d4-a716-446655440099',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Account not found');
    expect(fetchAccountWriteReference).toHaveBeenCalledWith(
      ORG_A,
      ACCOUNT_A,
      { forUpdate: true, requireActive: false },
      mockTx
    );
  });

  it('rejects assignee memberId not in org', async () => {
    vi.mocked(allMembersInOrg).mockResolvedValue(false);

    const err = await createTransaction(ORG_A, {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Test',
      categoryId: '550e8400-e29b-41d4-a716-446655440099',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe(
      'Member not found in this household'
    );
  });
});

describe('createTransaction — transaction account policy wiring', () => {
  beforeEach(() => {
    vi.mocked(fetchAccountWriteReference).mockReset();
    vi.mocked(allMembersInOrg).mockReset();
    vi.mocked(categoryExistsInOrg).mockReset();
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
    vi.mocked(categoryExistsInOrg).mockResolvedValue(true);
  });

  it('maps policy violations to DomainError before persisting', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'credit_card'),
    });

    const err = await createTransaction(ORG_A, {
      type: 'income',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Paycheck',
      incomeType: 'direct_deposit',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).statusCode).toBe(400);
    expect((err as DomainError).code).toBe(
      'TRANSACTION_ACCOUNT_POLICY_VIOLATION'
    );
  });

  it('requires counterpartAccountId for saved settlement writes', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'credit_card'),
    });

    const err = await createTransaction(ORG_A, {
      type: 'settlement',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Settlement',
      assignees: baseAssignees,
    } as unknown as CreateTransactionInput).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).message).toContain('counterpartAccountId');
  });

  it('requires counterpartAccountId for saved contribution writes', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'chequing'),
    });

    const err = await createTransaction(ORG_A, {
      type: 'contribution',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Contribution',
      assignees: baseAssignees,
    } as unknown as CreateTransactionInput).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).message).toContain('counterpartAccountId');
  });

  it('accepts a valid transfer and loads both accounts inside the write tx', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'chequing'),
      [ACCOUNT_B]: accountRef(ACCOUNT_B, 'savings'),
    });

    const result = await createTransaction(ORG_A, {
      type: 'transfer',
      accountId: ACCOUNT_A,
      counterpartAccountId: ACCOUNT_B,
      amount: 1000,
      date: '2026-05-01',
      description: 'Transfer',
      assignees: baseAssignees,
    });

    expect(result).toMatchObject({ id: expect.any(String) });
    expect(fetchAccountWriteReference).toHaveBeenCalledWith(
      ORG_A,
      ACCOUNT_A,
      { forUpdate: true, requireActive: false },
      mockTx
    );
    expect(fetchAccountWriteReference).toHaveBeenCalledWith(
      ORG_A,
      ACCOUNT_B,
      { forUpdate: true, requireActive: false },
      mockTx
    );
    expect(counterpartAccountBelongsToOrg).toHaveBeenCalledWith(
      ORG_A,
      ACCOUNT_B,
      mockTx
    );
    expect(fetchAccountWriteReference).not.toHaveBeenCalledWith(
      ORG_A,
      ACCOUNT_B,
      {},
      mockTx
    );
  });
});

describe('updateTransaction — transaction account policy wiring', () => {
  beforeEach(() => {
    vi.mocked(fetchAccountWriteReference).mockReset();
    vi.mocked(allMembersInOrg).mockReset();
    vi.mocked(fetchTransactionById).mockReset();
    vi.mocked(updateTransactionScalarsQuery).mockReset();
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
    vi.mocked(fetchTransactionById).mockResolvedValue({
      id: 'tx_1',
      orgId: ORG_A,
      type: 'transfer',
      amount: 1000,
      date: '2026-05-01',
      accountId: ACCOUNT_A,
      description: 'Transfer',
    } as never);
    vi.mocked(updateTransactionScalarsQuery).mockResolvedValue({
      id: 'tx_1',
    } as never);
  });

  it('rejects policy violations before persisting scalars', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'chequing'),
    });

    const err = await updateTransaction(ORG_A, 'tx_1', {
      type: 'contribution',
      accountId: ACCOUNT_A,
      counterpartAccountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Contribution',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect(updateTransactionScalarsQuery).not.toHaveBeenCalled();
    expect(fetchAccountWriteReference).toHaveBeenCalledWith(
      ORG_A,
      ACCOUNT_A,
      { forUpdate: true, requireActive: false },
      mockTx
    );
  });
});

describe('createTransaction — write planner checks', () => {
  beforeEach(() => {
    vi.mocked(fetchAccountWriteReference).mockReset();
    vi.mocked(counterpartAccountBelongsToOrg).mockReset();
    vi.mocked(refundOfExists).mockReset();
    vi.mocked(allMembersInOrg).mockReset();
    vi.mocked(categoryExistsInOrg).mockReset();
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'chequing'),
      [ACCOUNT_B]: accountRef(ACCOUNT_B, 'savings'),
    });
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
    vi.mocked(categoryExistsInOrg).mockResolvedValue(true);
    vi.mocked(counterpartAccountBelongsToOrg).mockResolvedValue(true);
    vi.mocked(refundOfExists).mockResolvedValue(true);
  });

  it('rejects split-sum mismatch before org or account lookups', async () => {
    const err = await createTransaction(ORG_A, {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Test',
      categoryId: '550e8400-e29b-41d4-a716-446655440099',
      assignees: [{ memberId: MEMBER_A, amountCents: 999, percentage: 100 }],
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).code).toBe('BAD_REQUEST');
    expect((err as DomainError).message).toBe(
      'Assignee amounts must sum to transaction amount'
    );
    expect(counterpartAccountBelongsToOrg).not.toHaveBeenCalled();
    expect(fetchAccountWriteReference).not.toHaveBeenCalled();
  });

  it('rejects counterpartAccountId that is not in the org', async () => {
    vi.mocked(counterpartAccountBelongsToOrg).mockResolvedValueOnce(false);

    const err = await createTransaction(ORG_A, {
      type: 'transfer',
      accountId: ACCOUNT_A,
      counterpartAccountId: ACCOUNT_B,
      amount: 1000,
      date: '2026-05-01',
      description: 'Transfer',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).code).toBe('INVALID_COUNTERPART_ACCOUNT');
    expect(fetchAccountWriteReference).not.toHaveBeenCalled();
  });

  it('rejects refundOf that is not in the org', async () => {
    vi.mocked(refundOfExists).mockResolvedValueOnce(false);
    const refundOfId = '550e8400-e29b-41d4-a716-446655440030';

    const err = await createTransaction(ORG_A, {
      type: 'refund',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Refund',
      categoryId: '550e8400-e29b-41d4-a716-446655440099',
      refundOf: refundOfId,
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).code).toBe('INVALID_REFUND_REFERENCE');
    expect(fetchAccountWriteReference).not.toHaveBeenCalled();
  });
});

describe('createTransaction / updateTransaction — archived account dates', () => {
  beforeEach(() => {
    vi.mocked(fetchAccountWriteReference).mockReset();
    vi.mocked(allMembersInOrg).mockReset();
    vi.mocked(categoryExistsInOrg).mockReset();
    vi.mocked(fetchTransactionById).mockReset();
    vi.mocked(updateTransactionScalarsQuery).mockReset();
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
    vi.mocked(categoryExistsInOrg).mockResolvedValue(true);
    vi.mocked(fetchTransactionById).mockResolvedValue({
      id: 'tx_1',
      orgId: ORG_A,
      type: 'expense',
      amount: 1000,
      date: '2026-01-15',
      accountId: ACCOUNT_A,
      description: 'Historical',
    } as never);
    vi.mocked(updateTransactionScalarsQuery).mockResolvedValue({
      id: 'tx_1',
    } as never);
    mockTx.insert.mockClear();
  });

  it('loads archived write refs including archivedAt', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(
        ACCOUNT_A,
        'chequing',
        new Date('2026-01-15T12:00:00.000Z')
      ),
    });

    await createTransaction(ORG_A, {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-01-15',
      description: 'Historical',
      categoryId: '550e8400-e29b-41d4-a716-446655440099',
      assignees: baseAssignees,
    });

    expect(fetchAccountWriteReference).toHaveBeenCalledWith(
      ORG_A,
      ACCOUNT_A,
      { forUpdate: true, requireActive: false },
      mockTx
    );
  });

  it('creates an expense on an active account', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'chequing'),
    });

    const result = await createTransaction(ORG_A, {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-06-01',
      description: 'Active',
      categoryId: '550e8400-e29b-41d4-a716-446655440099',
      assignees: baseAssignees,
    });

    expect(result).toMatchObject({ id: expect.any(String) });
  });

  it('creates a historical expense dated on the archive calendar date', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(
        ACCOUNT_A,
        'chequing',
        new Date('2026-01-15T18:00:00.000Z')
      ),
    });

    const result = await createTransaction(ORG_A, {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-01-15',
      description: 'On archive date',
      categoryId: '550e8400-e29b-41d4-a716-446655440099',
      assignees: baseAssignees,
    });

    expect(result).toMatchObject({ id: expect.any(String) });
  });

  it('rejects create when the date is after the archived account date', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(
        ACCOUNT_A,
        'chequing',
        new Date('2026-01-15T18:00:00.000Z')
      ),
    });

    const err = await createTransaction(ORG_A, {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-01-16',
      description: 'After archive',
      categoryId: '550e8400-e29b-41d4-a716-446655440099',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).code).toBe('ARCHIVED_ACCOUNT_DATE');
    expect(mockTx.insert).not.toHaveBeenCalled();
  });

  it('rejects create when only the counterpart is archived after the date', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'chequing'),
      [ACCOUNT_B]: accountRef(
        ACCOUNT_B,
        'savings',
        new Date('2026-01-01T00:00:00.000Z')
      ),
    });

    const err = await createTransaction(ORG_A, {
      type: 'transfer',
      accountId: ACCOUNT_A,
      counterpartAccountId: ACCOUNT_B,
      amount: 1000,
      date: '2026-01-02',
      description: 'Transfer',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).code).toBe('ARCHIVED_ACCOUNT_DATE');
    expect((err as DomainError).message).toContain('counterpart account');
    expect(mockTx.insert).not.toHaveBeenCalled();
  });

  it('rejects both slots independently when each is after its archive date', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(
        ACCOUNT_A,
        'chequing',
        new Date('2026-01-10T00:00:00.000Z')
      ),
      [ACCOUNT_B]: accountRef(
        ACCOUNT_B,
        'savings',
        new Date('2026-01-05T00:00:00.000Z')
      ),
    });

    const err = await createTransaction(ORG_A, {
      type: 'transfer',
      accountId: ACCOUNT_A,
      counterpartAccountId: ACCOUNT_B,
      amount: 1000,
      date: '2026-01-16',
      description: 'Transfer',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).message).toContain('This account cannot');
    expect((err as DomainError).message).toContain('counterpart account');
  });

  it('allows editing a historical transaction dated on or before the archive date', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(
        ACCOUNT_A,
        'chequing',
        new Date('2026-01-15T00:00:00.000Z')
      ),
    });

    const result = await updateTransaction(ORG_A, 'tx_1', {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-01-15',
      description: 'Still historical',
      categoryId: '550e8400-e29b-41d4-a716-446655440099',
      assignees: baseAssignees,
    });

    expect(result).toMatchObject({ id: 'tx_1' });
    expect(updateTransactionScalarsQuery).toHaveBeenCalled();
  });

  it('rejects editing a historical transaction onto a date after the archive date', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(
        ACCOUNT_A,
        'chequing',
        new Date('2026-01-15T00:00:00.000Z')
      ),
    });

    const err = await updateTransaction(ORG_A, 'tx_1', {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-01-16',
      description: 'Moved after archive',
      categoryId: '550e8400-e29b-41d4-a716-446655440099',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).code).toBe('ARCHIVED_ACCOUNT_DATE');
    expect(updateTransactionScalarsQuery).not.toHaveBeenCalled();
  });
});
