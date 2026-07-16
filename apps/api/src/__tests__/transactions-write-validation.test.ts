import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountType } from '@ploutizo/types';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  allMembersInOrg,
  allTagsInOrg,
  fetchAccountWriteReference,
} from '@/lib/queries/scope';
import { createTransaction, updateTransaction } from '@/services/transactions';
import {
  fetchTransactionById,
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
    transaction: vi.fn(
      async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
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
  counterpartAccountBelongsToOrg: vi.fn(),
  refundOfExists: vi.fn(),
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

const ORG_A = 'org_a';
const ACCOUNT_A = '550e8400-e29b-41d4-a716-446655440010';
const ACCOUNT_B = '550e8400-e29b-41d4-a716-446655440011';
const MEMBER_A = '550e8400-e29b-41d4-a716-446655440020';

const accountRef = (id: string, type: AccountType) => ({
  id,
  type,
  archivedAt: null,
});

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
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'chequing'),
    });
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
    vi.mocked(allTagsInOrg).mockResolvedValue(true);
  });

  it('rejects primary accountId not in org (two-org isolation)', async () => {
    mockAccountLookups({ [ACCOUNT_A]: null });

    const err = await createTransaction(ORG_A, {
      type: 'expense',
      accountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Test',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Account not found');
    expect(fetchAccountWriteReference).toHaveBeenCalledWith(
      ORG_A,
      ACCOUNT_A,
      { forUpdate: true },
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
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe(
      'Member not found in this household'
    );
  });
});

describe('createTransaction — transaction account policy', () => {
  beforeEach(() => {
    vi.mocked(fetchAccountWriteReference).mockReset();
    vi.mocked(allMembersInOrg).mockReset();
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
  });

  it('rejects disallowed account type combinations before persisting', async () => {
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
    expect((err as DomainError).message).toContain('must use one of');
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
    }).catch((e: unknown) => e);

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
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).message).toContain('counterpartAccountId');
  });

  it('rejects same-account transfer writes', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'chequing'),
    });

    const err = await createTransaction(ORG_A, {
      type: 'transfer',
      accountId: ACCOUNT_A,
      counterpartAccountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Transfer',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).message).toContain('must differ');
  });

  it('rejects same-account settlement writes', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'credit_card'),
    });

    const err = await createTransaction(ORG_A, {
      type: 'settlement',
      accountId: ACCOUNT_A,
      counterpartAccountId: ACCOUNT_A,
      amount: 1000,
      date: '2026-05-01',
      description: 'Settlement',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).message).toContain('must differ');
  });

  it('rejects invalid settlement funding account type', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'credit_card'),
      [ACCOUNT_B]: accountRef(ACCOUNT_B, 'investment'),
    });

    const err = await createTransaction(ORG_A, {
      type: 'settlement',
      accountId: ACCOUNT_A,
      counterpartAccountId: ACCOUNT_B,
      amount: 1000,
      date: '2026-05-01',
      description: 'Settlement',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).message).toContain('chequing');
  });

  it('accepts valid transfer account pair', async () => {
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
      { forUpdate: true },
      mockTx
    );
    expect(fetchAccountWriteReference).toHaveBeenCalledWith(
      ORG_A,
      ACCOUNT_B,
      { forUpdate: true },
      mockTx
    );
  });
});

describe('updateTransaction — transaction account policy', () => {
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

  it('rejects same-account contribution writes before persisting', async () => {
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
    expect((err as DomainError).message).toContain('must differ');
    expect(updateTransactionScalarsQuery).not.toHaveBeenCalled();
    expect(fetchAccountWriteReference).toHaveBeenCalledWith(
      ORG_A,
      ACCOUNT_A,
      { forUpdate: true },
      mockTx
    );
  });

  it('rejects invalid contribution destination account type', async () => {
    mockAccountLookups({
      [ACCOUNT_A]: accountRef(ACCOUNT_A, 'chequing'),
      [ACCOUNT_B]: accountRef(ACCOUNT_B, 'savings'),
    });

    const err = await updateTransaction(ORG_A, 'tx_1', {
      type: 'contribution',
      accountId: ACCOUNT_A,
      counterpartAccountId: ACCOUNT_B,
      amount: 1000,
      date: '2026-05-01',
      description: 'Contribution',
      assignees: baseAssignees,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).message).toContain('investment');
    expect(updateTransactionScalarsQuery).not.toHaveBeenCalled();
  });
});
