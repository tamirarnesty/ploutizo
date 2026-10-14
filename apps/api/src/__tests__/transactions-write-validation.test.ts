import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountType } from '@ploutizo/types';
import { DomainError } from '@/lib/errors';
import {
  allMembersInOrg,
  categoryExistsInOrg,
  fetchAccountWriteReference,
} from '@/lib/queries/scope';
import { updateTransaction } from '@/services/transactions';
import {
  fetchTransactionById,
  updateTransactionScalarsQuery,
} from '@/lib/queries/transactions';

const mockTx = {};

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

const ORG_A = 'org_a';
const ACCOUNT_A = '550e8400-e29b-41d4-a716-446655440010';
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

describe('updateTransaction — account policy and archived dates', () => {
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
    expect((err as DomainError).code).toBe(
      'TRANSACTION_ACCOUNT_POLICY_VIOLATION'
    );
    expect(updateTransactionScalarsQuery).not.toHaveBeenCalled();
    expect(fetchAccountWriteReference).toHaveBeenCalledWith(
      ORG_A,
      ACCOUNT_A,
      { forUpdate: true, requireActive: false },
      mockTx
    );
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
