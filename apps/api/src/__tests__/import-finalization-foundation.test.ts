import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT,
  BATCH,
  CATEGORY,
  FUNDING,
  MEMBER,
  ORG,
  TXN,
  accountRef,
  insertedRows,
  mockTx,
  resetTransactionWriteHarness,
  roundTrips,
  seedOrg,
} from './transaction-write-harness';
import {
  fetchTransactionById,
  updateTransactionScalarsQuery,
} from '@/lib/queries/transactions';
import { createTransaction } from '@/services/transaction-create';
import { updateTransaction } from '@/services/transactions';

const EXPENSE = '550e8400-e29b-41d4-a716-446655440060';

describe('import finalization foundation — transaction provenance', () => {
  beforeEach(() => {
    resetTransactionWriteHarness();
    seedOrg({
      accounts: [
        accountRef(ACCOUNT, 'credit_card'),
        accountRef(FUNDING, 'chequing'),
      ],
      categoryIds: [CATEGORY],
      memberIds: [MEMBER],
      transactionIds: [EXPENSE],
      importBatchIds: [BATCH],
    });
  });

  it('persists import-batch linkage, raw description, external id, and reviewed values', async () => {
    const inserted = await createTransaction(ORG, {
      type: 'expense',
      accountId: ACCOUNT,
      amount: 4218,
      date: '2026-05-02',
      description: 'Neighborhood Coffee',
      categoryId: CATEGORY,
      assignees: [{ memberId: MEMBER, amountCents: 4218, percentage: 100 }],
      importBatchId: BATCH,
      rawDescription: 'COFFEE SHOP #42',
      externalId: 'visa-1001',
      notes: 'weekly',
    });

    expect(insertedRows('transactions')).toEqual([
      {
        id: inserted.id,
        orgId: ORG,
        type: 'expense',
        accountId: ACCOUNT,
        amount: 4218,
        date: '2026-05-02',
        description: 'Neighborhood Coffee',
        categoryId: CATEGORY,
        importBatchId: BATCH,
        rawDescription: 'COFFEE SHOP #42',
        externalId: 'visa-1001',
        notes: 'weekly',
      },
    ]);
  });

  it('writes externalId without a service-side uniqueness preflight', async () => {
    // Re-import after soft-delete is owned by the partial unique index
    // (deleted_at IS NULL); the write path only maps that constraint.
    await createTransaction(ORG, {
      type: 'expense',
      accountId: ACCOUNT,
      amount: 4218,
      date: '2026-05-02',
      description: 'Neighborhood Coffee',
      categoryId: CATEGORY,
      assignees: [{ memberId: MEMBER, amountCents: 4218, percentage: 100 }],
      importBatchId: BATCH,
      externalId: 'visa-1001',
    });

    expect(roundTrips()).toEqual({
      accountLocks: 1,
      categories: 1,
      tags: 0,
      members: 1,
      refundTargets: 0,
      importBatches: 1,
      inserts: ['transactions', 'transaction_assignees'],
    });
  });

  it('persists settlement funding and category on the normal write path', async () => {
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

    expect(insertedRows('transactions')[0]).toMatchObject({
      type: 'settlement',
      counterpartAccountId: FUNDING,
      categoryId: CATEGORY,
      externalId: 'visa-1003',
      rawDescription: 'Payment Thank You',
      importBatchId: BATCH,
    });
  });

  it('persists refund link plus provenance on refund creates', async () => {
    await createTransaction(ORG, {
      type: 'refund',
      accountId: ACCOUNT,
      amount: 1499,
      date: '2026-05-08',
      description: 'Returned Charger',
      categoryId: CATEGORY,
      refundOf: EXPENSE,
      assignees: [{ memberId: MEMBER, amountCents: 1499, percentage: 100 }],
      importBatchId: BATCH,
      externalId: 'visa-1002',
      rawDescription: 'Returned Charger',
    });

    expect(insertedRows('transactions')[0]).toMatchObject({
      type: 'refund',
      refundOf: EXPENSE,
      categoryId: CATEGORY,
      externalId: 'visa-1002',
      importBatchId: BATCH,
    });
  });

  it('preserves settlement Bill Payment category on update', async () => {
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
});
