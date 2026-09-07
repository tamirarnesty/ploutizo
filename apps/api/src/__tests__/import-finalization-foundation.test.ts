import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  deleteImportPreparedSet,
  fetchPreparedSetForBatchRevision,
  insertImportPreparedOutcomes,
  insertImportPreparedSet,
  listPreparedOutcomesForSet,
  lockPreparedSetRevisionForBatch,
} from '@/lib/queries/import-prepared-sets';
import {
  listRefundTargetExpensesByIds,
  sumPriorRefundTotalsByTransactionTarget,
} from '@/lib/queries/import-refund-targets';
import {
  listActiveExternalIdOwners,
  listImportMatchTargets,
} from '@/lib/queries/import-match-targets';
import { listOrgMembers } from '@/lib/queries/households';
import {
  bumpImportDraftRevision,
  fetchDraftSummaryById,
  fetchImportBatchInOrg,
  listDraftRows,
} from '@/lib/queries/imports';
import {
  allMembersInOrg,
  allTagsInOrg,
  allTransactionsInOrg,
  categoryExistsInOrg,
  fetchAccountWriteReference,
  transactionExistsInOrg,
} from '@/lib/queries/scope';
import {
  buildReviewedValuesSnapshot,
  continueImportDraft,
  createImportPreparedSetRevision,
  getActiveImportPreparedConfirmation,
  invalidateImportPreparedSet,
} from '@/services/import-prepared-sets';
import { createTransaction, updateTransaction } from '@/services/transactions';
import {
  fetchTransactionById,
  updateTransactionScalarsQuery,
} from '@/lib/queries/transactions';

const mockTx = {
  insert: vi.fn(),
  execute: vi.fn(),
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
  allTransactionsInOrg: vi.fn(),
  categoryExistsInOrg: vi.fn(),
  transactionExistsInOrg: vi.fn(),
}));

vi.mock('@/lib/queries/imports', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error('Unexpected @/lib/queries/imports module shape.');
  }
  return {
    ...actual,
    fetchImportBatchInOrg: vi.fn(),
    fetchDraftSummaryById: vi.fn(),
    listDraftRows: vi.fn(),
    bumpImportDraftRevision: vi.fn(),
  };
});

vi.mock('@/lib/queries/import-prepared-sets', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error(
      'Unexpected @/lib/queries/import-prepared-sets module shape.'
    );
  }
  return {
    ...actual,
    insertImportPreparedSet: vi.fn(),
    insertImportPreparedOutcomes: vi.fn(),
    deleteImportPreparedSet: vi.fn(),
    lockPreparedSetRevisionForBatch: vi.fn(),
    fetchPreparedSetForBatchRevision: vi.fn(),
    listPreparedOutcomesForSet: vi.fn(),
    fetchPreparedSetById: vi.fn(),
  };
});

vi.mock('@/lib/queries/import-refund-targets', () => ({
  listRefundTargetExpensesByIds: vi.fn(),
  sumPriorRefundTotalsByTransactionTarget: vi.fn(),
}));

vi.mock('@/lib/queries/import-match-targets', () => ({
  listImportMatchTargets: vi.fn(),
  listActiveExternalIdOwners: vi.fn(() => new Map()),
}));

vi.mock('@/lib/queries/households', () => ({
  listOrgMembers: vi.fn(),
}));

const ORG = 'org_a';
const ACCOUNT = '550e8400-e29b-41d4-a716-446655440010';
const FUNDING = '550e8400-e29b-41d4-a716-446655440011';
const MEMBER = '550e8400-e29b-41d4-a716-446655440020';
const CATEGORY = '550e8400-e29b-41d4-a716-446655440030';
const BATCH = '550e8400-e29b-41d4-a716-446655440040';
const ROW = '550e8400-e29b-41d4-a716-446655440050';
const ROW_MATCHED = '550e8400-e29b-41d4-a716-446655440051';
const ROW_SKIPPED = '550e8400-e29b-41d4-a716-446655440052';
const ROW_INVALID = '550e8400-e29b-41d4-a716-446655440053';
const ROW_REFUND = '550e8400-e29b-41d4-a716-446655440054';
const TXN = '550e8400-e29b-41d4-a716-446655440070';

const baseAssignees = [
  { memberId: MEMBER, amountCents: 4218, percentage: 100 },
];

const draftRow = {
  id: ROW,
  batchId: BATCH,
  orgId: ORG,
  rowNumber: 1,
  rawData: {},
  externalId: 'visa-1001',
  sourceDate: '2026-05-02',
  sourceAmount: '42.18',
  sourceDescription: 'COFFEE SHOP #42',
  sourceType: 'expense',
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense' as const,
  parsedDescription: 'Coffee Shop',
  reviewDate: '2026-05-02',
  reviewAmount: 4218,
  reviewType: 'expense' as const,
  reviewDescription: 'Neighborhood Coffee',
  reviewCategoryId: CATEGORY,
  reviewAssigneeMemberIds: [MEMBER],
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: null,
  reviewRefundLinkHint: null,
  reviewMatchedTransactionId: null,
  reviewMatchDismissed: false,
  reviewNotes: 'weekly',
  reviewTagIds: [],
  selectedForImport: true,
  createdAt: new Date('2026-05-20T12:00:00Z'),
  updatedAt: new Date('2026-05-20T12:00:00Z'),
};

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

describe('import finalization foundation — prepared set revisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      id: BATCH,
      accountId: ACCOUNT,
      revision: 1,
      rowCount: 1,
    } as never);
    vi.mocked(listDraftRows).mockResolvedValue([draftRow as never]);
    vi.mocked(allTransactionsInOrg).mockResolvedValue(true);
    vi.mocked(lockPreparedSetRevisionForBatch).mockResolvedValue(undefined);
    vi.mocked(fetchPreparedSetForBatchRevision).mockResolvedValue(null);
    vi.mocked(transactionExistsInOrg).mockResolvedValue(true);
    vi.mocked(insertImportPreparedSet).mockResolvedValue({
      id: 'prep_1',
      orgId: ORG,
      batchId: BATCH,
      revision: 1,
      createdAt: new Date('2026-05-20T12:00:00Z'),
    });
    vi.mocked(insertImportPreparedOutcomes).mockImplementation((_tx, values) =>
      Promise.resolve(
        values.map((value, index) => ({
          id: `out_${index}`,
          orgId: value.orgId,
          preparedSetId: value.preparedSetId,
          batchRowId: value.batchRowId,
          outcome: value.outcome,
          transactionId: value.transactionId ?? null,
          reviewedValues: value.reviewedValues,
          createdAt: new Date('2026-05-20T12:00:00Z'),
        }))
      )
    );
  });

  it('snapshots reviewed values including raw description provenance', () => {
    expect(buildReviewedValuesSnapshot(draftRow as never)).toEqual({
      date: '2026-05-02',
      amount: 4218,
      type: 'expense',
      description: 'Neighborhood Coffee',
      categoryId: CATEGORY,
      assigneeMemberIds: [MEMBER],
      counterpartAccountId: null,
      refundOf: null,
      refundOfBatchRowId: null,
      notes: 'weekly',
      tagIds: [],
      externalId: 'visa-1001',
      rawDescription: 'COFFEE SHOP #42',
      selectedForImport: true,
    });
  });

  it('retains source description when it matches the reviewed description', () => {
    const snapshot = buildReviewedValuesSnapshot({
      ...draftRow,
      reviewDescription: draftRow.sourceDescription,
    } as never);

    expect(snapshot.rawDescription).toBe('COFFEE SHOP #42');
  });

  it('creates immutable revision 1 then increments to revision 2 using server snapshots', async () => {
    const first = await createImportPreparedSetRevision(ORG, BATCH, [
      {
        batchRowId: ROW,
        outcome: 'created',
      },
    ]);
    expect(first.revision).toBe(1);
    expect(first.outcomes[0]?.outcome).toBe('created');
    expect(first.outcomes[0]?.reviewedValues).toMatchObject({
      description: 'Neighborhood Coffee',
      externalId: 'visa-1001',
      rawDescription: 'COFFEE SHOP #42',
    });
    expect(lockPreparedSetRevisionForBatch).toHaveBeenCalledWith(
      mockTx,
      ORG,
      BATCH
    );
    expect(fetchDraftSummaryById).toHaveBeenCalledWith(ORG, BATCH, mockTx);
    expect(listDraftRows).toHaveBeenCalledWith(ORG, BATCH, mockTx);

    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      id: BATCH,
      accountId: ACCOUNT,
      revision: 2,
      rowCount: 1,
    } as never);
    vi.mocked(insertImportPreparedSet).mockResolvedValue({
      id: 'prep_2',
      orgId: ORG,
      batchId: BATCH,
      revision: 2,
      createdAt: new Date('2026-05-20T13:00:00Z'),
    });

    const second = await createImportPreparedSetRevision(ORG, BATCH, [
      {
        batchRowId: ROW,
        outcome: 'matched',
        transactionId: TXN,
      },
    ]);
    expect(second.revision).toBe(2);
    expect(second.outcomes[0]?.outcome).toBe('matched');
    expect(insertImportPreparedSet).toHaveBeenLastCalledWith(
      mockTx,
      expect.objectContaining({ revision: 2 })
    );
  });

  it('rejects prepared sets for unknown draft rows', async () => {
    const err = await createImportPreparedSetRevision(ORG, BATCH, [
      {
        batchRowId: '550e8400-e29b-41d4-a716-446655440099',
        outcome: 'skipped',
      },
    ]).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
  });

  it('rejects prepared sets with duplicate batch rows', async () => {
    const err = await createImportPreparedSetRevision(ORG, BATCH, [
      {
        batchRowId: ROW,
        outcome: 'created',
      },
      {
        batchRowId: ROW,
        outcome: 'skipped',
      },
    ]).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 400,
      message: 'Prepared set outcomes must not contain duplicate batch rows.',
    });
    expect(lockPreparedSetRevisionForBatch).not.toHaveBeenCalled();
  });

  it('rejects prepared outcomes that point at a cross-org transaction', async () => {
    vi.mocked(allTransactionsInOrg).mockResolvedValue(false);
    const err = await createImportPreparedSetRevision(ORG, BATCH, [
      {
        batchRowId: ROW,
        outcome: 'matched',
        transactionId: TXN,
      },
    ]).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect(allTransactionsInOrg).toHaveBeenCalledWith(ORG, [TXN], mockTx);
  });

  it('returns the active prepared confirmation for the current draft revision', async () => {
    vi.mocked(fetchPreparedSetForBatchRevision).mockResolvedValue({
      id: 'prep_1',
      orgId: ORG,
      batchId: BATCH,
      revision: 1,
      createdAt: new Date('2026-05-20T12:00:00Z'),
    });
    vi.mocked(listPreparedOutcomesForSet).mockResolvedValue([
      {
        id: 'out_0',
        orgId: ORG,
        preparedSetId: 'prep_1',
        batchRowId: ROW,
        outcome: 'created',
        transactionId: null,
        reviewedValues: buildReviewedValuesSnapshot(draftRow as never),
        createdAt: new Date('2026-05-20T12:00:00Z'),
      },
    ]);

    await expect(
      getActiveImportPreparedConfirmation(ORG, BATCH)
    ).resolves.toMatchObject({
      id: 'prep_1',
      revision: 1,
      rowCount: 1,
      counts: { created: 1, matched: 0, skipped: 0, invalid: 0 },
      created: [{ outcome: 'created', batchRowId: ROW }],
      matched: [],
    });
  });

  it('does not treat an unprocessed prepared set as the active confirmation', async () => {
    vi.mocked(fetchPreparedSetForBatchRevision).mockResolvedValue({
      id: 'prep_1',
      orgId: ORG,
      batchId: BATCH,
      revision: 1,
      createdAt: new Date('2026-05-20T12:00:00Z'),
    });
    vi.mocked(listPreparedOutcomesForSet).mockResolvedValue([
      {
        id: 'out_0',
        orgId: ORG,
        preparedSetId: 'prep_1',
        batchRowId: ROW,
        outcome: 'unprocessed',
        transactionId: null,
        reviewedValues: buildReviewedValuesSnapshot(draftRow as never),
        createdAt: new Date('2026-05-20T12:00:00Z'),
      },
    ]);

    const err = await getActiveImportPreparedConfirmation(ORG, BATCH).catch(
      (e: unknown) => e
    );

    expect(err).toBeInstanceOf(NotFoundError);
  });
});

describe('continueImportDraft', () => {
  const matchTarget = {
    id: TXN,
    accountId: ACCOUNT,
    type: 'expense',
    date: '2026-05-02',
    amount: 4218,
    description: 'Neighborhood Coffee',
    rawDescription: 'COFFEE SHOP #42',
    externalId: 'visa-1001',
    deleted: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      id: BATCH,
      accountId: ACCOUNT,
      revision: 1,
      rowCount: 1,
    } as never);
    vi.mocked(listDraftRows).mockResolvedValue([draftRow as never]);
    vi.mocked(allTransactionsInOrg).mockResolvedValue(true);
    vi.mocked(listRefundTargetExpensesByIds).mockResolvedValue(new Map());
    vi.mocked(listImportMatchTargets).mockResolvedValue(new Map());
    vi.mocked(listActiveExternalIdOwners).mockResolvedValue(new Map());
    vi.mocked(sumPriorRefundTotalsByTransactionTarget).mockResolvedValue(
      new Map()
    );
    vi.mocked(listOrgMembers).mockResolvedValue([
      { id: MEMBER, userId: 'user_1', orgId: ORG, role: 'member' },
    ] as never);
    vi.mocked(fetchAccountWriteReference).mockResolvedValue({
      id: ACCOUNT,
      type: 'credit_card',
    });
    vi.mocked(lockPreparedSetRevisionForBatch).mockResolvedValue(undefined);
    vi.mocked(fetchPreparedSetForBatchRevision).mockResolvedValue(null);
    vi.mocked(transactionExistsInOrg).mockResolvedValue(true);
    vi.mocked(insertImportPreparedSet).mockResolvedValue({
      id: 'prep_1',
      orgId: ORG,
      batchId: BATCH,
      revision: 1,
      createdAt: new Date('2026-05-20T12:00:00Z'),
    });
    vi.mocked(insertImportPreparedOutcomes).mockImplementation((_tx, values) =>
      Promise.resolve(
        values.map((value, index) => ({
          id: `out_${index}`,
          orgId: value.orgId,
          preparedSetId: value.preparedSetId,
          batchRowId: value.batchRowId,
          outcome: value.outcome,
          transactionId: value.transactionId ?? null,
          reviewedValues: value.reviewedValues,
          createdAt: new Date('2026-05-20T12:00:00Z'),
        }))
      )
    );
  });

  it('creates a revision-bound prepared set and returns its identifier', async () => {
    const result = await continueImportDraft(ORG, BATCH);

    expect(lockPreparedSetRevisionForBatch).toHaveBeenCalledWith(
      mockTx,
      ORG,
      BATCH
    );
    expect(listOrgMembers).toHaveBeenCalledWith(ORG, mockTx);
    expect(sumPriorRefundTotalsByTransactionTarget).toHaveBeenCalledWith(
      ORG,
      [],
      mockTx
    );
    expect(insertImportPreparedSet).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ revision: 1 })
    );
    expect(result).toEqual({
      id: 'prep_1',
      batchId: BATCH,
      revision: 1,
      createdAt: '2026-05-20T12:00:00.000Z',
    });
    expect(result).not.toHaveProperty('outcomes');
  });

  it('rejects when no rows are selected for import', async () => {
    vi.mocked(listDraftRows).mockResolvedValue([
      { ...draftRow, selectedForImport: false } as never,
    ]);

    const err = await continueImportDraft(ORG, BATCH).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 400,
      code: 'IMPORT_CONTINUE_NONE_SELECTED',
    });
    expect(insertImportPreparedSet).not.toHaveBeenCalled();
  });

  it('rejects selected create rows with namespaced requirement keys', async () => {
    vi.mocked(listDraftRows).mockResolvedValue([
      { ...draftRow, reviewCategoryId: null } as never,
    ]);

    const err = await continueImportDraft(ORG, BATCH).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 400,
      code: 'IMPORT_CONTINUE_NOT_READY',
      details: {
        rows: [
          {
            batchRowId: ROW,
            key: 'transaction.category.required',
          },
        ],
      },
    });
    expect(insertImportPreparedSet).not.toHaveBeenCalled();
  });

  it('rejects created rows whose external id already exists on the account', async () => {
    vi.mocked(listActiveExternalIdOwners).mockResolvedValue(
      new Map([['visa-1001', TXN]])
    );

    const err = await continueImportDraft(ORG, BATCH).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 400,
      code: 'IMPORT_CONTINUE_NOT_READY',
      details: {
        rows: [
          {
            batchRowId: ROW,
            key: 'import.external_id.active_conflict',
            params: { transactionId: TXN, externalId: 'visa-1001' },
          },
        ],
      },
    });
    expect(insertImportPreparedSet).not.toHaveBeenCalled();
  });

  it('rejects two selected rows that accept the same existing transaction', async () => {
    const sharedTarget = { ...matchTarget, externalId: null };
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      id: BATCH,
      accountId: ACCOUNT,
      revision: 1,
      rowCount: 2,
    } as never);
    vi.mocked(listDraftRows).mockResolvedValue([
      {
        ...draftRow,
        externalId: null,
        reviewMatchedTransactionId: TXN,
      },
      {
        ...draftRow,
        id: ROW_MATCHED,
        rowNumber: 2,
        externalId: null,
        reviewMatchedTransactionId: TXN,
      },
    ] as never);
    vi.mocked(listImportMatchTargets).mockResolvedValue(
      new Map([[TXN, sharedTarget]])
    );

    const err = await continueImportDraft(ORG, BATCH).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 400,
      code: 'IMPORT_CONTINUE_NOT_READY',
      details: {
        rows: expect.arrayContaining([
          expect.objectContaining({
            batchRowId: ROW,
            key: 'import.match.duplicate_target',
          }),
          expect.objectContaining({
            batchRowId: ROW_MATCHED,
            key: 'import.match.duplicate_target',
          }),
        ]),
      },
    });
    expect(insertImportPreparedSet).not.toHaveBeenCalled();
  });

  it('projects mixed full-file outcomes that sum to rowCount', async () => {
    const createdRow = {
      ...draftRow,
      externalId: 'visa-created',
      sourceDescription: 'NEW MERCHANT',
      parsedDescription: 'New Merchant',
      reviewDescription: 'New Merchant',
      reviewAmount: 9999,
      parsedAmount: 9999,
    };
    const matchedRow = {
      ...draftRow,
      id: ROW_MATCHED,
      rowNumber: 2,
      externalId: 'visa-1001',
      selectedForImport: true,
      reviewMatchedTransactionId: TXN,
    };
    const skippedRow = {
      ...draftRow,
      id: ROW_SKIPPED,
      rowNumber: 3,
      externalId: 'visa-1003',
      selectedForImport: false,
      reviewMatchedTransactionId: null,
    };
    const invalidRow = {
      ...draftRow,
      id: ROW_INVALID,
      rowNumber: 4,
      externalId: null,
      selectedForImport: false,
      reviewDate: null,
      parsedDate: null,
      reviewAmount: null,
      parsedAmount: null,
      reviewType: null,
      parsedType: null,
      reviewDescription: null,
      parsedDescription: null,
    };
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      id: BATCH,
      accountId: ACCOUNT,
      revision: 1,
      rowCount: 4,
    } as never);
    vi.mocked(listDraftRows).mockResolvedValue([
      createdRow,
      matchedRow,
      skippedRow,
      invalidRow,
    ] as never);
    vi.mocked(listImportMatchTargets).mockResolvedValue(
      new Map([[TXN, matchTarget]])
    );

    await continueImportDraft(ORG, BATCH);

    const inserted = vi.mocked(insertImportPreparedOutcomes).mock.calls[0]?.[1];
    expect(inserted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchRowId: ROW, outcome: 'created' }),
        expect.objectContaining({
          batchRowId: ROW_MATCHED,
          outcome: 'matched',
          transactionId: TXN,
        }),
        expect.objectContaining({
          batchRowId: ROW_SKIPPED,
          outcome: 'skipped',
        }),
        expect.objectContaining({
          batchRowId: ROW_INVALID,
          outcome: 'invalid',
        }),
      ])
    );
    expect(inserted).toHaveLength(4);
    expect(
      inserted.reduce(
        (sum, row) =>
          row.outcome === 'created' ||
          row.outcome === 'matched' ||
          row.outcome === 'skipped' ||
          row.outcome === 'invalid'
            ? sum + 1
            : sum,
        0
      )
    ).toBe(4);
    expect(inserted.every((row) => row.outcome !== 'unprocessed')).toBe(true);
  });

  it('creates a matched outcome when a selected row has a saved accepted match', async () => {
    vi.mocked(listDraftRows).mockResolvedValue([
      { ...draftRow, reviewMatchedTransactionId: TXN } as never,
    ]);
    vi.mocked(listImportMatchTargets).mockResolvedValue(
      new Map([[TXN, matchTarget]])
    );

    await continueImportDraft(ORG, BATCH);

    expect(insertImportPreparedOutcomes).toHaveBeenCalledWith(mockTx, [
      expect.objectContaining({
        batchRowId: ROW,
        outcome: 'matched',
        transactionId: TXN,
      }),
    ]);
  });

  it('rejects a selected same-import refund whose expense is unselected', async () => {
    const expenseRow = { ...draftRow, selectedForImport: false };
    const refundRow = {
      ...draftRow,
      id: ROW_REFUND,
      rowNumber: 2,
      externalId: 'visa-refund',
      reviewType: 'refund' as const,
      parsedType: 'refund' as const,
      reviewRefundOfBatchRowId: ROW,
      selectedForImport: true,
    };
    vi.mocked(listDraftRows).mockResolvedValue([
      expenseRow,
      refundRow,
    ] as never);

    const err = await continueImportDraft(ORG, BATCH).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      code: 'IMPORT_CONTINUE_NOT_READY',
      details: {
        rows: expect.arrayContaining([
          expect.objectContaining({
            batchRowId: ROW_REFUND,
            key: 'import.refund_link.target_not_selected',
          }),
        ]),
      },
    });
    expect(insertImportPreparedSet).not.toHaveBeenCalled();
  });

  it('prepares a selected same-import refund when its expense is a create candidate', async () => {
    const refundRow = {
      ...draftRow,
      id: ROW_REFUND,
      rowNumber: 2,
      externalId: 'visa-refund',
      reviewType: 'refund' as const,
      parsedType: 'refund' as const,
      reviewAmount: 1000,
      parsedAmount: 1000,
      reviewRefundOfBatchRowId: ROW,
      selectedForImport: true,
    };
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      id: BATCH,
      accountId: ACCOUNT,
      revision: 1,
      rowCount: 2,
    } as never);
    vi.mocked(listDraftRows).mockResolvedValue([draftRow, refundRow] as never);

    await continueImportDraft(ORG, BATCH);

    expect(insertImportPreparedOutcomes).toHaveBeenCalledWith(
      mockTx,
      expect.arrayContaining([
        expect.objectContaining({ batchRowId: ROW, outcome: 'created' }),
        expect.objectContaining({
          batchRowId: ROW_REFUND,
          outcome: 'created',
          reviewedValues: expect.objectContaining({
            refundOfBatchRowId: ROW,
          }),
        }),
      ])
    );
  });

  it('does not attach a leftover match transaction id to a skipped outcome', async () => {
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      id: BATCH,
      accountId: ACCOUNT,
      revision: 1,
      rowCount: 2,
    } as never);
    vi.mocked(listDraftRows).mockResolvedValue([
      draftRow,
      {
        ...draftRow,
        id: ROW_SKIPPED,
        rowNumber: 2,
        externalId: 'visa-1003',
        selectedForImport: false,
        reviewMatchedTransactionId: TXN,
      },
    ] as never);
    vi.mocked(listImportMatchTargets).mockResolvedValue(
      new Map([[TXN, matchTarget]])
    );

    await continueImportDraft(ORG, BATCH);

    expect(insertImportPreparedOutcomes).toHaveBeenCalledWith(
      mockTx,
      expect.arrayContaining([
        expect.objectContaining({
          batchRowId: ROW,
          outcome: 'created',
          transactionId: null,
        }),
        expect.objectContaining({
          batchRowId: ROW_SKIPPED,
          outcome: 'skipped',
          transactionId: null,
        }),
      ])
    );
  });

  it('returns the existing prepared set for the current draft revision', async () => {
    vi.mocked(fetchPreparedSetForBatchRevision).mockResolvedValue({
      id: 'prep_existing',
      orgId: ORG,
      batchId: BATCH,
      revision: 1,
      createdAt: new Date('2026-05-20T11:00:00Z'),
    });
    vi.mocked(listPreparedOutcomesForSet).mockResolvedValue([
      {
        id: 'out_existing',
        orgId: ORG,
        preparedSetId: 'prep_existing',
        batchRowId: ROW,
        outcome: 'created',
        transactionId: null,
        reviewedValues: buildReviewedValuesSnapshot(draftRow as never),
        createdAt: new Date('2026-05-20T11:00:00Z'),
      },
    ]);

    const result = await continueImportDraft(ORG, BATCH);

    expect(insertImportPreparedSet).not.toHaveBeenCalled();
    expect(deleteImportPreparedSet).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'prep_existing',
      revision: 1,
    });
  });

  it('replaces an obsolete unprocessed set bound to the current revision', async () => {
    vi.mocked(fetchPreparedSetForBatchRevision).mockResolvedValue({
      id: 'prep_obsolete',
      orgId: ORG,
      batchId: BATCH,
      revision: 1,
      createdAt: new Date('2026-05-20T11:00:00Z'),
    });
    vi.mocked(listPreparedOutcomesForSet).mockResolvedValue([
      {
        id: 'out_obsolete',
        orgId: ORG,
        preparedSetId: 'prep_obsolete',
        batchRowId: ROW,
        outcome: 'unprocessed',
        transactionId: null,
        reviewedValues: buildReviewedValuesSnapshot(draftRow as never),
        createdAt: new Date('2026-05-20T11:00:00Z'),
      },
    ]);
    vi.mocked(deleteImportPreparedSet).mockResolvedValue(undefined);

    await continueImportDraft(ORG, BATCH);

    expect(deleteImportPreparedSet).toHaveBeenCalledWith(
      mockTx,
      ORG,
      'prep_obsolete'
    );
    expect(insertImportPreparedSet).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ revision: 1 })
    );
    expect(insertImportPreparedOutcomes).toHaveBeenCalledWith(mockTx, [
      expect.objectContaining({
        batchRowId: ROW,
        outcome: 'created',
      }),
    ]);
  });

  it('snapshots the evaluated draft rows without re-reading for preparation', async () => {
    const evaluatedRow = { ...draftRow };
    const staleRow = { ...draftRow, reviewCategoryId: null };

    vi.mocked(listDraftRows).mockResolvedValueOnce([evaluatedRow as never]);
    vi.mocked(listDraftRows).mockResolvedValue([staleRow as never]);

    await continueImportDraft(ORG, BATCH);

    expect(listDraftRows).toHaveBeenCalledTimes(1);
    expect(insertImportPreparedOutcomes).toHaveBeenCalledWith(
      mockTx,
      expect.arrayContaining([
        expect.objectContaining({
          reviewedValues: expect.objectContaining({
            categoryId: CATEGORY,
          }),
        }),
      ])
    );
  });
});

describe('prepared staging invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      id: BATCH,
      accountId: ACCOUNT,
      revision: 1,
      rowCount: 1,
    } as never);
    vi.mocked(lockPreparedSetRevisionForBatch).mockResolvedValue(undefined);
    vi.mocked(bumpImportDraftRevision).mockResolvedValue(undefined as never);
    vi.mocked(fetchPreparedSetForBatchRevision).mockResolvedValue(null);
  });

  it('bumps the draft revision on explicit invalidation', async () => {
    await invalidateImportPreparedSet(ORG, BATCH);

    expect(lockPreparedSetRevisionForBatch).toHaveBeenCalledWith(
      mockTx,
      ORG,
      BATCH
    );
    expect(bumpImportDraftRevision).toHaveBeenCalledWith(ORG, BATCH, mockTx);
  });

  it('never treats a stale prepared revision as active', async () => {
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      id: BATCH,
      accountId: ACCOUNT,
      revision: 2,
      rowCount: 1,
    } as never);

    const err = await getActiveImportPreparedConfirmation(ORG, BATCH).catch(
      (e: unknown) => e
    );

    expect(err).toBeInstanceOf(NotFoundError);
    expect(fetchPreparedSetForBatchRevision).toHaveBeenCalledWith(
      ORG,
      BATCH,
      2
    );
  });

  it('404s when the draft revision advances after the prepared set is loaded', async () => {
    vi.mocked(fetchDraftSummaryById)
      .mockResolvedValueOnce({
        id: BATCH,
        accountId: ACCOUNT,
        revision: 1,
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        id: BATCH,
        accountId: ACCOUNT,
        revision: 2,
        rowCount: 1,
      } as never);
    vi.mocked(fetchPreparedSetForBatchRevision).mockResolvedValue({
      id: 'prep_1',
      orgId: ORG,
      batchId: BATCH,
      revision: 1,
      createdAt: new Date('2026-05-20T12:00:00Z'),
    });
    vi.mocked(listPreparedOutcomesForSet).mockResolvedValue([
      {
        id: 'out_0',
        orgId: ORG,
        preparedSetId: 'prep_1',
        batchRowId: ROW,
        outcome: 'created',
        transactionId: null,
        reviewedValues: buildReviewedValuesSnapshot(draftRow as never),
        createdAt: new Date('2026-05-20T12:00:00Z'),
      },
    ]);

    const err = await getActiveImportPreparedConfirmation(ORG, BATCH).catch(
      (e: unknown) => e
    );

    expect(err).toBeInstanceOf(NotFoundError);
    expect(fetchDraftSummaryById).toHaveBeenCalledTimes(2);
  });

  it('404s when the draft is not in the org', async () => {
    vi.mocked(fetchDraftSummaryById).mockResolvedValue(null);

    const err = await getActiveImportPreparedConfirmation(ORG, BATCH).catch(
      (e: unknown) => e
    );

    expect(err).toBeInstanceOf(NotFoundError);
  });
});
