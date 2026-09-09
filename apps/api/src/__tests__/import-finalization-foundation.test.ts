import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT,
  BATCH,
  CATEGORY,
  FUNDING,
  MEMBER,
  ORG,
  TXN,
  baseAssignees,
  mockTx,
} from './import-prepared-sets-fixtures';
import { DomainError, NotFoundError } from '@/lib/errors';
import { fetchImportBatchInOrg } from '@/lib/queries/imports';
import {
  allMembersInOrg,
  allTagsInOrg,
  allTransactionsInOrg,
  categoryExistsInOrg,
  fetchAccountWriteReference,
  transactionExistsInOrg,
} from '@/lib/queries/scope';
import {
  fetchTransactionById,
  updateTransactionScalarsQuery,
} from '@/lib/queries/transactions';
import { createTransaction, updateTransaction } from '@/services/transactions';

describe('import finalization foundation — transaction provenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAccountWriteReference).mockResolvedValue({
      id: ACCOUNT,
      type: 'credit_card',
    });
    vi.mocked(allMembersInOrg).mockResolvedValue(true);
    vi.mocked(allTagsInOrg).mockResolvedValue(true);
    vi.mocked(allTransactionsInOrg).mockResolvedValue(true);
    vi.mocked(categoryExistsInOrg).mockResolvedValue(true);
    vi.mocked(transactionExistsInOrg).mockResolvedValue(true);
    vi.mocked(fetchImportBatchInOrg).mockResolvedValue({ id: BATCH });

    const returning = vi.fn().mockResolvedValue([
      {
        id: 'tx_1',
        orgId: ORG,
        accountId: ACCOUNT,
        type: 'expense',
        amount: 4218,
        date: '2026-05-02',
        description: 'Neighborhood Coffee',
        categoryId: CATEGORY,
        importBatchId: BATCH,
        rawDescription: 'COFFEE SHOP #42',
        externalId: 'visa-1001',
      },
    ]);
    const values = vi.fn().mockReturnValue({ returning });
    mockTx.insert.mockReturnValue({ values });
  });

  it('persists import-batch linkage, raw description, external id, and reviewed values', async () => {
    const inserted = await createTransaction(ORG, {
      type: 'expense',
      accountId: ACCOUNT,
      amount: 4218,
      date: '2026-05-02',
      description: 'Neighborhood Coffee',
      categoryId: CATEGORY,
      assignees: baseAssignees,
      importBatchId: BATCH,
      rawDescription: 'COFFEE SHOP #42',
      externalId: 'visa-1001',
      notes: 'weekly',
    });

    expect(fetchImportBatchInOrg).toHaveBeenCalledWith(ORG, BATCH, mockTx);
    expect(mockTx.insert).toHaveBeenCalled();
    const valuesFn = mockTx.insert.mock.results[0]?.value.values as ReturnType<
      typeof vi.fn
    >;
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: ORG,
        accountId: ACCOUNT,
        description: 'Neighborhood Coffee',
        categoryId: CATEGORY,
        importBatchId: BATCH,
        rawDescription: 'COFFEE SHOP #42',
        externalId: 'visa-1001',
        notes: 'weekly',
      })
    );
    expect(inserted).toMatchObject({
      importBatchId: BATCH,
      rawDescription: 'COFFEE SHOP #42',
      externalId: 'visa-1001',
    });
  });

  it('maps active-row external id conflicts to DomainError(409)', async () => {
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockRejectedValue({
        code: '23505',
        constraint: 'transactions_active_account_external_id_idx',
      }),
    });
    mockTx.insert.mockReturnValue({ values });

    const err = await createTransaction(ORG, {
      type: 'expense',
      accountId: ACCOUNT,
      amount: 4218,
      date: '2026-05-02',
      description: 'Neighborhood Coffee',
      categoryId: CATEGORY,
      assignees: baseAssignees,
      externalId: 'visa-1001',
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect((err as DomainError).statusCode).toBe(409);
    expect((err as DomainError).code).toBe('EXTERNAL_ID_CONFLICT');
  });

  it('writes externalId without a service-side uniqueness preflight', async () => {
    // Re-import after soft-delete is owned by the partial unique index
    // (deleted_at IS NULL). The write path inserts and maps only that
    // active-row constraint — it does not look up prior soft-deleted peers.
    const inserted = await createTransaction(ORG, {
      type: 'expense',
      accountId: ACCOUNT,
      amount: 4218,
      date: '2026-05-02',
      description: 'Neighborhood Coffee',
      categoryId: CATEGORY,
      assignees: baseAssignees,
      importBatchId: BATCH,
      rawDescription: 'COFFEE SHOP #42',
      externalId: 'visa-1001',
    });

    expect(inserted).toMatchObject({ externalId: 'visa-1001' });
    const valuesFn = mockTx.insert.mock.results[0]?.value.values as ReturnType<
      typeof vi.fn
    >;
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({ externalId: 'visa-1001' })
    );
  });

  it('rejects importBatchId that does not belong to the org', async () => {
    vi.mocked(fetchImportBatchInOrg).mockResolvedValue(null);

    const err = await createTransaction(ORG, {
      type: 'expense',
      accountId: ACCOUNT,
      amount: 4218,
      date: '2026-05-02',
      description: 'Neighborhood Coffee',
      categoryId: CATEGORY,
      assignees: baseAssignees,
      importBatchId: BATCH,
      externalId: 'visa-1001',
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Import batch not found.');
    expect(fetchImportBatchInOrg).toHaveBeenCalledWith(ORG, BATCH, mockTx);
  });

  it('does not map unrelated unique violations as external-id conflicts', async () => {
    mockTx.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: TXN, type: 'expense' }]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockRejectedValue({
          code: '23505',
          constraint: 'transaction_assignees_tx_member_idx',
        }),
      });

    const err = await createTransaction(ORG, {
      type: 'expense',
      accountId: ACCOUNT,
      amount: 4218,
      date: '2026-05-02',
      description: 'Neighborhood Coffee',
      categoryId: CATEGORY,
      assignees: baseAssignees,
      externalId: 'visa-1001',
    }).catch((e: unknown) => e);

    expect(err).not.toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      code: '23505',
      constraint: 'transaction_assignees_tx_member_idx',
    });
  });

  it('persists settlement funding and category on the normal write path', async () => {
    vi.mocked(fetchAccountWriteReference).mockImplementation(
      (_orgId, accountId) =>
        Promise.resolve(
          accountId === ACCOUNT
            ? { id: ACCOUNT, type: 'credit_card' }
            : { id: FUNDING, type: 'chequing' }
        )
    );
    const returning = vi.fn().mockResolvedValue([
      {
        id: 'tx_settle',
        type: 'settlement',
        counterpartAccountId: FUNDING,
        categoryId: CATEGORY,
      },
    ]);
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning }),
    });

    await createTransaction(ORG, {
      type: 'settlement',
      accountId: ACCOUNT,
      amount: 25000,
      date: '2026-05-15',
      description: 'Bill Payment',
      categoryId: CATEGORY,
      counterpartAccountId: FUNDING,
      assignees: [{ memberId: MEMBER, amountCents: 25000, percentage: 100 }],
      importBatchId: BATCH,
      externalId: 'visa-1003',
      rawDescription: 'Payment Thank You',
    });

    const valuesFn = mockTx.insert.mock.results[0]?.value.values as ReturnType<
      typeof vi.fn
    >;
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'settlement',
        counterpartAccountId: FUNDING,
        categoryId: CATEGORY,
        externalId: 'visa-1003',
        rawDescription: 'Payment Thank You',
        importBatchId: BATCH,
      })
    );
  });

  it('preserves settlement Bill Payment category on update', async () => {
    vi.mocked(fetchAccountWriteReference).mockImplementation(
      (_orgId, accountId) =>
        Promise.resolve(
          accountId === ACCOUNT
            ? { id: ACCOUNT, type: 'credit_card' }
            : { id: FUNDING, type: 'chequing' }
        )
    );
    vi.mocked(fetchTransactionById).mockResolvedValue({
      id: TXN,
      orgId: ORG,
      type: 'settlement',
      accountId: ACCOUNT,
      amount: 25000,
      date: '2026-05-15',
      description: 'Bill Payment',
      categoryId: CATEGORY,
      counterpartAccountId: FUNDING,
    } as never);
    vi.mocked(updateTransactionScalarsQuery).mockResolvedValue({
      id: TXN,
      type: 'settlement',
      categoryId: CATEGORY,
    } as never);

    await updateTransaction(ORG, TXN, {
      type: 'settlement',
      accountId: ACCOUNT,
      amount: 25000,
      date: '2026-05-15',
      description: 'Bill Payment',
      categoryId: CATEGORY,
      counterpartAccountId: FUNDING,
      assignees: [{ memberId: MEMBER, amountCents: 25000, percentage: 100 }],
    });

    expect(updateTransactionScalarsQuery).toHaveBeenCalledWith(
      mockTx,
      ORG,
      TXN,
      expect.objectContaining({
        type: 'settlement',
        categoryId: CATEGORY,
        counterpartAccountId: FUNDING,
      })
    );
    const scalarPayload = vi.mocked(updateTransactionScalarsQuery).mock
      .calls[0]?.[3];
    expect(scalarPayload).not.toHaveProperty('importBatchId');
    expect(scalarPayload).not.toHaveProperty('externalId');
    expect(scalarPayload).not.toHaveProperty('rawDescription');
  });

  it('persists refund link plus provenance on refund creates', async () => {
    const expenseId = '550e8400-e29b-41d4-a716-446655440060';
    const returning = vi.fn().mockResolvedValue([
      {
        id: 'tx_refund',
        type: 'refund',
        refundOf: expenseId,
        externalId: 'visa-1002',
      },
    ]);
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning }),
    });

    await createTransaction(ORG, {
      type: 'refund',
      accountId: ACCOUNT,
      amount: 1499,
      date: '2026-05-08',
      description: 'Returned Charger',
      categoryId: CATEGORY,
      refundOf: expenseId,
      assignees: [{ memberId: MEMBER, amountCents: 1499, percentage: 100 }],
      importBatchId: BATCH,
      externalId: 'visa-1002',
      rawDescription: 'Returned Charger',
    });

    const valuesFn = mockTx.insert.mock.results[0]?.value.values as ReturnType<
      typeof vi.fn
    >;
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'refund',
        refundOf: expenseId,
        categoryId: CATEGORY,
        externalId: 'visa-1002',
        importBatchId: BATCH,
      })
    );
  });
});
