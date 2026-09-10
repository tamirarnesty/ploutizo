import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT,
  BATCH,
  CATEGORY,
  MEMBER,
  ORG,
  ROW,
  ROW_INVALID,
  ROW_MATCHED,
  ROW_REFUND,
  ROW_SKIPPED,
  TXN,
  draftRow,
  mockTx,
  rowSnapshot,
} from './import-prepared-sets-fixtures';
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
  listDraftRows,
} from '@/lib/queries/imports';
import {
  allTransactionsInOrg,
  fetchAccountWriteReference,
  transactionExistsInOrg,
} from '@/lib/queries/scope';
import {
  continueImportDraft,
  getActiveImportPreparedConfirmation,
  invalidateImportPreparedSet,
} from '@/services/import-prepared-sets';

describe('prepared import confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      id: BATCH,
      accountId: ACCOUNT,
      revision: 1,
      rowCount: 1,
    } as never);
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
        snapshot: rowSnapshot(),
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
        snapshot: rowSnapshot(),
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
          snapshot: value.snapshot,
          createdAt: new Date('2026-05-20T12:00:00Z'),
        }))
      )
    );
  });

  it('creates a revision-bound prepared set and returns its identifier', async () => {
    const result = await continueImportDraft(ORG, BATCH);

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
          snapshot: expect.objectContaining({
            reviewedValues: expect.objectContaining({
              refundOfBatchRowId: ROW,
            }),
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
        snapshot: rowSnapshot(),
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
        snapshot: rowSnapshot(),
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
          snapshot: expect.objectContaining({
            reviewedValues: expect.objectContaining({
              categoryId: CATEGORY,
            }),
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
        snapshot: rowSnapshot(),
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
