import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportPreparedReviewedValues } from '@ploutizo/types';
import { DomainError, NotFoundError } from '@/lib/errors';
import { finalizeImportDraft } from '@/services/import-finalize';
import {
  evaluateImportSetForContinue,
  invalidatePreparedStagingForDraft,
} from '@/services/import-prepared-sets';
import { createTransactionInTx } from '@/services/transactions';
import {
  completeImportBatch,
  fetchImportBatchSummaryById,
  listDraftRows,
} from '@/lib/queries/imports';
import {
  deleteImportPreparedSetsForBatch,
  fetchPreparedSetById,
  listPreparedOutcomesForSet,
  lockPreparedSetRevisionForBatch,
} from '@/lib/queries/import-prepared-sets';
import { listActiveExternalIdOwners } from '@/lib/queries/import-match-targets';
import { insertImportTransactionLinks } from '@/lib/queries/import-transaction-links';

const mockTx = {
  insert: vi.fn(),
  execute: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  select: vi.fn(),
};

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    ),
  },
}));

vi.mock('@/lib/queries/imports', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error('Unexpected @/lib/queries/imports module shape.');
  }
  return {
    ...actual,
    fetchImportBatchSummaryById: vi.fn(),
    listDraftRows: vi.fn(),
    completeImportBatch: vi.fn(),
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
    lockPreparedSetRevisionForBatch: vi.fn(),
    fetchPreparedSetById: vi.fn(),
    listPreparedOutcomesForSet: vi.fn(),
    deleteImportPreparedSetsForBatch: vi.fn(),
  };
});

vi.mock('@/lib/queries/import-match-targets', () => ({
  listImportMatchTargets: vi.fn(),
  listActiveExternalIdOwners: vi.fn(),
}));

vi.mock('@/lib/queries/import-transaction-links', () => ({
  insertImportTransactionLinks: vi.fn(),
}));

vi.mock('@/services/import-prepared-sets', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error('Unexpected @/services/import-prepared-sets module shape.');
  }
  return {
    ...actual,
    evaluateImportSetForContinue: vi.fn(),
    invalidatePreparedStagingForDraft: vi.fn(),
  };
});

vi.mock('@/services/transactions', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error('Unexpected @/services/transactions module shape.');
  }
  return {
    ...actual,
    createTransactionInTx: vi.fn(),
  };
});

const ORG = 'org_a';
const ACCOUNT = '550e8400-e29b-41d4-a716-446655440010';
const MEMBER = '550e8400-e29b-41d4-a716-446655440020';
const CATEGORY = '550e8400-e29b-41d4-a716-446655440030';
const BATCH = '550e8400-e29b-41d4-a716-446655440040';
const PREP = '550e8400-e29b-41d4-a716-446655440060';
const OTHER_PREP = '550e8400-e29b-41d4-a716-446655440061';
const ROW_CREATED = '550e8400-e29b-41d4-a716-446655440050';
const ROW_MATCHED = '550e8400-e29b-41d4-a716-446655440051';
const ROW_SKIPPED = '550e8400-e29b-41d4-a716-446655440052';
const ROW_INVALID = '550e8400-e29b-41d4-a716-446655440053';
const ROW_REFUND = '550e8400-e29b-41d4-a716-446655440054';
const EXISTING_TX = '550e8400-e29b-41d4-a716-446655440070';
const CREATED_TX = '550e8400-e29b-41d4-a716-446655440071';
const REFUND_TX = '550e8400-e29b-41d4-a716-446655440072';

const reviewed = (
  overrides: Partial<ImportPreparedReviewedValues> = {}
): ImportPreparedReviewedValues => ({
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
  externalId: 'visa-created',
  rawDescription: 'COFFEE SHOP #42',
  selectedForImport: true,
  ...overrides,
});

const draftRow = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  batchId: BATCH,
  orgId: ORG,
  rowNumber: 1,
  rawData: {},
  externalId: 'visa-created',
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
  ...extra,
});

const draftBatch = {
  id: BATCH,
  accountId: ACCOUNT,
  accountName: 'Visa',
  accountInstitutionId: 'td',
  accountLastFour: '1234',
  contentProfileId: 'internal',
  status: 'draft' as const,
  fileName: 'statement.csv',
  rowCount: 4,
  importedAt: new Date('2026-05-20T12:00:00Z'),
  completedAt: null,
  discardedAt: null,
  revision: 1,
  finalizedPreparedSetId: null,
  createdCount: null,
  matchedCount: null,
  skippedCount: null,
  invalidCount: null,
  createdAt: new Date('2026-05-20T12:00:00Z'),
  updatedAt: new Date('2026-05-20T12:00:00Z'),
};

const completedBatch = {
  ...draftBatch,
  status: 'completed' as const,
  completedAt: new Date('2026-05-21T12:00:00Z'),
  updatedAt: new Date('2026-05-21T12:00:00Z'),
  finalizedPreparedSetId: PREP,
  createdCount: 1,
  matchedCount: 1,
  skippedCount: 1,
  invalidCount: 1,
};

const preparedSet = {
  id: PREP,
  orgId: ORG,
  batchId: BATCH,
  revision: 1,
  createdAt: new Date('2026-05-20T12:00:00Z'),
};

const outcome = (
  batchRowId: string,
  kind: 'created' | 'matched' | 'skipped' | 'invalid',
  extra: Record<string, unknown> = {}
) => ({
  id: `out_${batchRowId}`,
  orgId: ORG,
  preparedSetId: PREP,
  batchRowId,
  outcome: kind,
  transactionId: kind === 'matched' ? EXISTING_TX : null,
  reviewedValues: reviewed({
    selectedForImport: kind === 'created' || kind === 'matched',
    externalId:
      kind === 'created'
        ? 'visa-created'
        : kind === 'matched'
          ? 'visa-1001'
          : null,
    type: kind === 'invalid' ? null : 'expense',
  }),
  createdAt: new Date('2026-05-20T12:00:00Z'),
  ...extra,
});

const mixedOutcomes = [
  outcome(ROW_CREATED, 'created'),
  outcome(ROW_MATCHED, 'matched'),
  outcome(ROW_SKIPPED, 'skipped', {
    reviewedValues: reviewed({ selectedForImport: false, externalId: null }),
  }),
  outcome(ROW_INVALID, 'invalid', {
    reviewedValues: reviewed({
      selectedForImport: false,
      type: null,
      description: null,
      amount: null,
      date: null,
      externalId: null,
    }),
  }),
];

describe('finalizeImportDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lockPreparedSetRevisionForBatch).mockResolvedValue(undefined);
    vi.mocked(fetchImportBatchSummaryById).mockResolvedValue(
      draftBatch as never
    );
    vi.mocked(fetchPreparedSetById).mockResolvedValue(preparedSet as never);
    vi.mocked(listPreparedOutcomesForSet).mockResolvedValue(
      mixedOutcomes as never
    );
    vi.mocked(listDraftRows).mockResolvedValue([
      draftRow(ROW_CREATED),
      draftRow(ROW_MATCHED, {
        selectedForImport: true,
        reviewMatchedTransactionId: EXISTING_TX,
        externalId: 'visa-1001',
      }),
      draftRow(ROW_SKIPPED, { selectedForImport: false }),
      draftRow(ROW_INVALID, {
        selectedForImport: false,
        parsedDate: null,
        parsedAmount: null,
        parsedType: null,
        parsedDescription: null,
        reviewDate: null,
        reviewAmount: null,
        reviewType: null,
        reviewDescription: null,
      }),
    ] as never);
    vi.mocked(evaluateImportSetForContinue).mockResolvedValue({
      failures: [],
      matchEvaluations: new Map([
        [
          ROW_MATCHED,
          { acceptedMatch: { transactionId: EXISTING_TX }, issues: [] },
        ],
      ]),
    } as never);
    vi.mocked(listActiveExternalIdOwners).mockResolvedValue(new Map());
    vi.mocked(createTransactionInTx).mockResolvedValue({
      id: CREATED_TX,
    } as never);
    vi.mocked(insertImportTransactionLinks).mockResolvedValue([]);
    vi.mocked(completeImportBatch).mockResolvedValue({ id: BATCH } as never);
    vi.mocked(deleteImportPreparedSetsForBatch).mockResolvedValue(undefined);
    vi.mocked(invalidatePreparedStagingForDraft).mockResolvedValue(undefined);
  });

  it('creates transactions, matched links, completed facts, and staging cleanup atomically', async () => {
    vi.mocked(fetchImportBatchSummaryById)
      .mockResolvedValueOnce(draftBatch as never)
      .mockResolvedValueOnce(completedBatch as never);

    const result = await finalizeImportDraft(ORG, BATCH, PREP);

    expect(lockPreparedSetRevisionForBatch).toHaveBeenCalledWith(
      mockTx,
      ORG,
      BATCH
    );
    expect(createTransactionInTx).toHaveBeenCalledOnce();
    expect(createTransactionInTx).toHaveBeenCalledWith(
      mockTx,
      ORG,
      expect.objectContaining({
        type: 'expense',
        importBatchId: BATCH,
        rawDescription: 'COFFEE SHOP #42',
        externalId: 'visa-created',
        description: 'Neighborhood Coffee',
      })
    );
    expect(insertImportTransactionLinks).toHaveBeenCalledWith(
      mockTx,
      expect.arrayContaining([
        expect.objectContaining({
          batchRowId: ROW_CREATED,
          transactionId: CREATED_TX,
          outcome: 'created',
        }),
        expect.objectContaining({
          batchRowId: ROW_MATCHED,
          transactionId: EXISTING_TX,
          outcome: 'matched',
        }),
      ])
    );
    expect(completeImportBatch).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        preparedSetId: PREP,
        createdCount: 1,
        matchedCount: 1,
        skippedCount: 1,
        invalidCount: 1,
      })
    );
    expect(deleteImportPreparedSetsForBatch).toHaveBeenCalledWith(
      mockTx,
      ORG,
      BATCH
    );
    expect(result).toMatchObject({
      status: 'completed',
      preparedSetId: PREP,
      rowCount: 4,
      createdCount: 1,
      matchedCount: 1,
      skippedCount: 1,
      invalidCount: 1,
    });
    expect(
      result.createdCount +
        result.matchedCount +
        result.skippedCount +
        result.invalidCount
    ).toBe(result.rowCount);
  });

  it('rolls back without completing when transaction creation fails', async () => {
    vi.mocked(createTransactionInTx).mockRejectedValue(
      new Error('write failed')
    );

    const err = await finalizeImportDraft(ORG, BATCH, PREP).catch(
      (error: unknown) => error
    );

    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(DomainError);
    expect((err as Error).message).toBe('write failed');
    expect(completeImportBatch).not.toHaveBeenCalled();
    expect(deleteImportPreparedSetsForBatch).not.toHaveBeenCalled();
    expect(invalidatePreparedStagingForDraft).not.toHaveBeenCalled();
  });

  it('returns the same completed summary on idempotent retry without additional writes', async () => {
    vi.mocked(fetchImportBatchSummaryById).mockResolvedValue(
      completedBatch as never
    );

    const result = await finalizeImportDraft(ORG, BATCH, PREP);

    expect(createTransactionInTx).not.toHaveBeenCalled();
    expect(insertImportTransactionLinks).not.toHaveBeenCalled();
    expect(completeImportBatch).not.toHaveBeenCalled();
    expect(result.preparedSetId).toBe(PREP);
    expect(result.createdCount).toBe(1);
  });

  it('rejects a different prepared-set identifier after completion', async () => {
    vi.mocked(fetchImportBatchSummaryById).mockResolvedValue(
      completedBatch as never
    );

    const err = await finalizeImportDraft(ORG, BATCH, OTHER_PREP).catch(
      (error: unknown) => error
    );

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 409,
      code: 'IMPORT_FINALIZE_CONFLICT',
    });
    expect(createTransactionInTx).not.toHaveBeenCalled();
  });

  it('rejects a stale prepared revision and invalidates staging', async () => {
    vi.mocked(fetchPreparedSetById).mockResolvedValue({
      ...preparedSet,
      revision: 1,
    } as never);
    vi.mocked(fetchImportBatchSummaryById).mockResolvedValue({
      ...draftBatch,
      revision: 2,
    } as never);

    const err = await finalizeImportDraft(ORG, BATCH, PREP).catch(
      (error: unknown) => error
    );

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 409,
      code: 'IMPORT_FINALIZE_STALE',
    });
    expect(invalidatePreparedStagingForDraft).toHaveBeenCalledWith(
      mockTx,
      ORG,
      BATCH
    );
    expect(createTransactionInTx).not.toHaveBeenCalled();
    expect(completeImportBatch).not.toHaveBeenCalled();
  });

  it('rejects an active external-id conflict with structured row issues', async () => {
    vi.mocked(listActiveExternalIdOwners).mockResolvedValue(
      new Map([['visa-created', EXISTING_TX]])
    );

    const err = await finalizeImportDraft(ORG, BATCH, PREP).catch(
      (error: unknown) => error
    );

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 400,
      code: 'IMPORT_FINALIZE_NOT_READY',
      details: {
        rows: [
          expect.objectContaining({
            batchRowId: ROW_CREATED,
            key: 'import.external_id.active_conflict',
          }),
        ],
      },
    });
    expect(invalidatePreparedStagingForDraft).toHaveBeenCalled();
    expect(createTransactionInTx).not.toHaveBeenCalled();
  });

  it('creates same-import expenses before linked refunds', async () => {
    const refundReviewed = reviewed({
      type: 'refund',
      amount: 1000,
      externalId: 'visa-refund',
      refundOfBatchRowId: ROW_CREATED,
      description: 'Coffee refund',
    });
    vi.mocked(listPreparedOutcomesForSet).mockResolvedValue([
      outcome(ROW_REFUND, 'created', { reviewedValues: refundReviewed }),
      outcome(ROW_CREATED, 'created'),
    ] as never);
    vi.mocked(fetchImportBatchSummaryById)
      .mockResolvedValueOnce({ ...draftBatch, rowCount: 2 } as never)
      .mockResolvedValueOnce({
        ...completedBatch,
        rowCount: 2,
        createdCount: 2,
        matchedCount: 0,
        skippedCount: 0,
        invalidCount: 0,
      } as never);
    vi.mocked(listDraftRows).mockResolvedValue([
      draftRow(ROW_CREATED),
      draftRow(ROW_REFUND, {
        reviewType: 'refund',
        parsedType: 'refund',
        reviewRefundOfBatchRowId: ROW_CREATED,
        reviewAmount: 1000,
        parsedAmount: 1000,
      }),
    ] as never);
    vi.mocked(evaluateImportSetForContinue).mockResolvedValue({
      failures: [],
      matchEvaluations: new Map(),
    } as never);

    const createdIds = [CREATED_TX, REFUND_TX];
    vi.mocked(createTransactionInTx).mockImplementation((_tx, _org, data) =>
      Promise.resolve({
        id: data.type === 'expense' ? createdIds[0] : createdIds[1],
      } as never)
    );

    await finalizeImportDraft(ORG, BATCH, PREP);

    const types = vi
      .mocked(createTransactionInTx)
      .mock.calls.map(([, , payload]) => payload.type);
    expect(types).toEqual(['expense', 'refund']);
    expect(createTransactionInTx).toHaveBeenNthCalledWith(
      2,
      mockTx,
      ORG,
      expect.objectContaining({
        type: 'refund',
        refundOf: CREATED_TX,
      })
    );
  });

  it('does not overwrite matched transaction provenance', async () => {
    vi.mocked(fetchImportBatchSummaryById)
      .mockResolvedValueOnce(draftBatch as never)
      .mockResolvedValueOnce(completedBatch as never);

    await finalizeImportDraft(ORG, BATCH, PREP);

    const createdPayloads = vi
      .mocked(createTransactionInTx)
      .mock.calls.map(([, , payload]) => payload);
    expect(createdPayloads).toHaveLength(1);
    expect(createdPayloads[0]).toMatchObject({
      importBatchId: BATCH,
      externalId: 'visa-created',
    });
    const links = vi.mocked(insertImportTransactionLinks).mock.calls[0][1];
    const matched = links.find((link) => link.outcome === 'matched');
    expect(matched?.transactionId).toBe(EXISTING_TX);
    expect(createTransactionInTx).not.toHaveBeenCalledWith(
      mockTx,
      ORG,
      expect.objectContaining({ importBatchId: BATCH, externalId: 'visa-1001' })
    );
  });

  it('404s when the prepared set is missing or belongs to another batch', async () => {
    vi.mocked(fetchPreparedSetById).mockResolvedValue(null);

    const err = await finalizeImportDraft(ORG, BATCH, PREP).catch(
      (error: unknown) => error
    );

    expect(err).toBeInstanceOf(NotFoundError);
    expect(createTransactionInTx).not.toHaveBeenCalled();
  });

  it('rejects finalize against a discarded import', async () => {
    vi.mocked(fetchImportBatchSummaryById).mockResolvedValue({
      ...draftBatch,
      status: 'discarded',
      discardedAt: new Date('2026-05-21T12:00:00.000Z'),
    } as never);

    const err = await finalizeImportDraft(ORG, BATCH, PREP).catch(
      (error: unknown) => error
    );

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 409,
      code: 'IMPORT_FINALIZE_CONFLICT',
    });
    expect(createTransactionInTx).not.toHaveBeenCalled();
  });
});
