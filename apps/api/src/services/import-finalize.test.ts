import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportRowSnapshot, ReviewedImportValues } from '@ploutizo/types';
import { DomainError, NotFoundError } from '@/lib/errors';
import { verifyImportSetForDraft } from '@/services/import-set';
import { finalizeImportDraft } from '@/services/import-finalize';
import { createTransactionInTx } from '@/services/transactions';
import {
  completeImportBatch,
  fetchImportBatchSummaryById,
  lockImportDraftBatch,
} from '@/lib/queries/imports';
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
    completeImportBatch: vi.fn(),
    lockImportDraftBatch: vi.fn(),
  };
});

vi.mock('@/lib/queries/import-transaction-links', () => ({
  insertImportTransactionLinks: vi.fn(),
}));

vi.mock('@/services/import-set', () => ({
  verifyImportSetForDraft: vi.fn(),
}));

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
const ROW_CREATED = '550e8400-e29b-41d4-a716-446655440050';
const ROW_MATCHED = '550e8400-e29b-41d4-a716-446655440051';
const ROW_SKIPPED = '550e8400-e29b-41d4-a716-446655440052';
const ROW_INVALID = '550e8400-e29b-41d4-a716-446655440053';
const ROW_REFUND = '550e8400-e29b-41d4-a716-446655440054';
const EXISTING_TX = '550e8400-e29b-41d4-a716-446655440070';
const CREATED_TX = '550e8400-e29b-41d4-a716-446655440071';
const REFUND_TX = '550e8400-e29b-41d4-a716-446655440072';
const SELECTED_ROW_IDS = [ROW_CREATED, ROW_MATCHED, ROW_SKIPPED, ROW_INVALID];

const snapshot = (
  overrides: Partial<ReviewedImportValues> = {},
  provenance: Partial<ImportRowSnapshot['provenance']> = {}
): ImportRowSnapshot => ({
  reviewedValues: {
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
    ...overrides,
  },
  provenance: {
    externalId: 'visa-created',
    rawDescription: 'COFFEE SHOP #42',
    parsedDescription: 'Coffee Shop',
    ...provenance,
  },
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
  createdCount: 1,
  matchedCount: 1,
  skippedCount: 1,
  invalidCount: 1,
};

type ProjectedOutcome = {
  batchRowId: string;
  outcome: 'created' | 'matched' | 'skipped' | 'invalid';
  transactionId: string | null;
  snapshot: ImportRowSnapshot;
};

const outcome = (
  batchRowId: string,
  kind: ProjectedOutcome['outcome'],
  extra: Partial<ProjectedOutcome> = {}
): ProjectedOutcome => ({
  batchRowId,
  outcome: kind,
  transactionId: kind === 'matched' ? EXISTING_TX : null,
  snapshot: snapshot(
    {
      type: kind === 'invalid' ? null : 'expense',
    },
    {
      externalId:
        kind === 'created'
          ? 'visa-created'
          : kind === 'matched'
            ? 'visa-1001'
            : null,
    }
  ),
  ...extra,
});

const mixedOutcomes = [
  outcome(ROW_CREATED, 'created'),
  outcome(ROW_MATCHED, 'matched'),
  outcome(ROW_SKIPPED, 'skipped', {
    snapshot: snapshot({}, { externalId: null }),
  }),
  outcome(ROW_INVALID, 'invalid', {
    snapshot: snapshot(
      {
        type: null,
        description: null,
        amount: null,
        date: null,
      },
      { externalId: null }
    ),
  }),
];

describe('finalizeImportDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lockImportDraftBatch).mockResolvedValue(undefined);
    vi.mocked(fetchImportBatchSummaryById).mockResolvedValue(
      draftBatch as never
    );
    vi.mocked(verifyImportSetForDraft).mockResolvedValue({
      ready: true,
      draft: draftBatch as never,
      projection: mixedOutcomes,
    });
    vi.mocked(createTransactionInTx).mockResolvedValue({
      id: CREATED_TX,
    } as never);
    vi.mocked(insertImportTransactionLinks).mockResolvedValue([]);
    vi.mocked(completeImportBatch).mockResolvedValue({ id: BATCH } as never);
  });

  it('creates transactions, matched links, and completed facts atomically', async () => {
    vi.mocked(fetchImportBatchSummaryById)
      .mockResolvedValueOnce(draftBatch as never)
      .mockResolvedValueOnce(completedBatch as never);

    const result = await finalizeImportDraft({
      orgId: ORG,
      batchId: BATCH,
      rowIds: SELECTED_ROW_IDS,
    });

    expect(lockImportDraftBatch).toHaveBeenCalledWith(mockTx, ORG, BATCH);
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
        createdCount: 1,
        matchedCount: 1,
        skippedCount: 1,
        invalidCount: 1,
      })
    );
    expect(result).toMatchObject({
      status: 'completed',
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

    const err = await finalizeImportDraft({
      orgId: ORG,
      batchId: BATCH,
      rowIds: SELECTED_ROW_IDS,
    }).catch((error: unknown) => error);

    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(DomainError);
    expect((err as Error).message).toBe('write failed');
    expect(completeImportBatch).not.toHaveBeenCalled();
  });

  it('returns the same completed summary on idempotent retry without additional writes', async () => {
    vi.mocked(fetchImportBatchSummaryById).mockResolvedValue(
      completedBatch as never
    );

    const result = await finalizeImportDraft({
      orgId: ORG,
      batchId: BATCH,
      rowIds: SELECTED_ROW_IDS,
    });

    expect(createTransactionInTx).not.toHaveBeenCalled();
    expect(insertImportTransactionLinks).not.toHaveBeenCalled();
    expect(completeImportBatch).not.toHaveBeenCalled();
    expect(result.createdCount).toBe(1);
  });

  it('rejects an active external-id conflict with structured row issues', async () => {
    vi.mocked(verifyImportSetForDraft).mockResolvedValue({
      ready: false,
      failures: [
        {
          batchRowId: ROW_CREATED,
          key: 'import.external_id.active_conflict',
          params: { transactionId: EXISTING_TX, externalId: 'visa-created' },
        },
      ],
    });

    const err = await finalizeImportDraft({
      orgId: ORG,
      batchId: BATCH,
      rowIds: SELECTED_ROW_IDS,
    }).catch((error: unknown) => error);

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
    expect(createTransactionInTx).not.toHaveBeenCalled();
  });

  it('rejects duplicate matched transaction ids with structured row issues', async () => {
    vi.mocked(verifyImportSetForDraft).mockResolvedValue({
      ready: false,
      failures: [
        {
          batchRowId: ROW_CREATED,
          key: 'import.match.duplicate_target',
        },
        {
          batchRowId: ROW_MATCHED,
          key: 'import.match.duplicate_target',
        },
      ],
    });

    const err = await finalizeImportDraft({
      orgId: ORG,
      batchId: BATCH,
      rowIds: SELECTED_ROW_IDS,
    }).catch((error: unknown) => error);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      statusCode: 400,
      code: 'IMPORT_FINALIZE_NOT_READY',
    });
    expect(insertImportTransactionLinks).not.toHaveBeenCalled();
  });

  it('creates same-import expenses before linked refunds', async () => {
    const refundSnapshot = snapshot(
      {
        type: 'refund',
        amount: 1000,
        refundOfBatchRowId: ROW_CREATED,
        description: 'Coffee refund',
      },
      { externalId: 'visa-refund' }
    );
    const refundProjection = [
      outcome(ROW_REFUND, 'created', { snapshot: refundSnapshot }),
      outcome(ROW_CREATED, 'created'),
    ];
    vi.mocked(verifyImportSetForDraft).mockResolvedValue({
      ready: true,
      draft: { ...draftBatch, rowCount: 2 } as never,
      projection: refundProjection,
    });
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

    const createdIds = [CREATED_TX, REFUND_TX];
    vi.mocked(createTransactionInTx).mockImplementation((_tx, _org, data) =>
      Promise.resolve({
        id: data.type === 'expense' ? createdIds[0] : createdIds[1],
      } as never)
    );

    await finalizeImportDraft({
      orgId: ORG,
      batchId: BATCH,
      rowIds: [ROW_REFUND, ROW_CREATED],
    });

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

  it('links same-import refunds to matched expense transaction ids', async () => {
    const refundSnapshot = snapshot(
      {
        type: 'refund',
        amount: 1000,
        refundOfBatchRowId: ROW_MATCHED,
        description: 'Coffee refund',
      },
      { externalId: 'visa-refund' }
    );
    const matchedRefundProjection = [
      outcome(ROW_MATCHED, 'matched'),
      outcome(ROW_REFUND, 'created', { snapshot: refundSnapshot }),
    ];
    vi.mocked(verifyImportSetForDraft).mockResolvedValue({
      ready: true,
      draft: { ...draftBatch, rowCount: 2 } as never,
      projection: matchedRefundProjection,
    });
    vi.mocked(fetchImportBatchSummaryById)
      .mockResolvedValueOnce({ ...draftBatch, rowCount: 2 } as never)
      .mockResolvedValueOnce({
        ...completedBatch,
        rowCount: 2,
        createdCount: 1,
        matchedCount: 1,
        skippedCount: 0,
        invalidCount: 0,
      } as never);
    vi.mocked(createTransactionInTx).mockResolvedValue({
      id: REFUND_TX,
    } as never);

    await finalizeImportDraft({
      orgId: ORG,
      batchId: BATCH,
      rowIds: [ROW_MATCHED, ROW_REFUND],
    });

    expect(createTransactionInTx).toHaveBeenCalledWith(
      mockTx,
      ORG,
      expect.objectContaining({
        type: 'refund',
        refundOf: EXISTING_TX,
      })
    );
  });

  it('does not overwrite matched transaction provenance', async () => {
    vi.mocked(fetchImportBatchSummaryById)
      .mockResolvedValueOnce(draftBatch as never)
      .mockResolvedValueOnce(completedBatch as never);

    await finalizeImportDraft({
      orgId: ORG,
      batchId: BATCH,
      rowIds: SELECTED_ROW_IDS,
    });

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

  it('404s when a selected row id is not on the draft', async () => {
    vi.mocked(verifyImportSetForDraft).mockRejectedValue(
      new NotFoundError('Import draft row not found.')
    );

    await expect(
      finalizeImportDraft({
        orgId: ORG,
        batchId: BATCH,
        rowIds: SELECTED_ROW_IDS,
      })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(createTransactionInTx).not.toHaveBeenCalled();
  });

  it('rejects finalize against a discarded import', async () => {
    vi.mocked(fetchImportBatchSummaryById).mockResolvedValue({
      ...draftBatch,
      status: 'discarded',
      discardedAt: new Date('2026-05-21T12:00:00.000Z'),
    } as never);

    await expect(
      finalizeImportDraft({
        orgId: ORG,
        batchId: BATCH,
        rowIds: SELECTED_ROW_IDS,
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'IMPORT_FINALIZE_CONFLICT',
    });
    expect(createTransactionInTx).not.toHaveBeenCalled();
  });
});
