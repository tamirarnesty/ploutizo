import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyImportSetForContinue } from '@ploutizo/utils/import-set-verification';
import { DomainError, NotFoundError } from '@/lib/errors';
import { verifyImportDraftProjectionForRowIds } from '@/services/import-draft-projection';
import { loadImportContinueDraftFacts } from '@/services/import-continue';
import { fetchDraftSummaryById, listDraftRows } from '@/lib/queries/imports';

vi.mock('@/lib/queries/imports', () => ({
  fetchDraftSummaryById: vi.fn(),
  listDraftRows: vi.fn(),
}));

vi.mock('@/services/import-continue', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error('Unexpected @/services/import-continue module shape.');
  }
  return {
    ...actual,
    loadImportContinueDraftFacts: vi.fn(),
  };
});

vi.mock('@ploutizo/utils/import-set-verification', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error(
      'Unexpected @ploutizo/utils/import-set-verification module shape.'
    );
  }
  return {
    ...actual,
    verifyImportSetForContinue: vi.fn(),
  };
});

const mockTx = {} as never;
const draft = {
  id: 'batch-1',
  accountId: 'account-1',
  rowCount: 1,
};

describe('verifyImportDraftProjectionForRowIds', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fetchDraftSummaryById).mockResolvedValue(draft as never);
    vi.mocked(listDraftRows).mockResolvedValue([
      { id: 'row-1', batchId: 'batch-1' },
    ] as never);
    vi.mocked(loadImportContinueDraftFacts).mockResolvedValue({
      rowCount: 1,
      rows: [],
    } as never);
  });

  it('404s when a row id is not on the draft', async () => {
    await expect(
      verifyImportDraftProjectionForRowIds(
        'org_1',
        'batch-1',
        ['row-missing'],
        mockTx
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns structured failures when verification is not ready', async () => {
    vi.mocked(verifyImportSetForContinue).mockReturnValue({
      ready: false,
      failures: [{ batchRowId: 'row-1', key: 'transaction.category.required' }],
    });

    const result = await verifyImportDraftProjectionForRowIds(
      'org_1',
      'batch-1',
      ['row-1'],
      mockTx
    );

    expect(result).toEqual({
      ready: false,
      failures: [{ batchRowId: 'row-1', key: 'transaction.category.required' }],
    });
  });

  it('returns projection when verification succeeds', async () => {
    const projection = [
      {
        batchRowId: 'row-1',
        outcome: 'skipped' as const,
        transactionId: null,
        snapshot: {} as never,
      },
    ];
    vi.mocked(verifyImportSetForContinue).mockReturnValue({
      ready: true,
      projection,
    });

    const result = await verifyImportDraftProjectionForRowIds(
      'org_1',
      'batch-1',
      ['row-1'],
      mockTx
    );

    expect(result).toEqual({ ready: true, draft, projection });
  });

  it('500s when the draft has no account', async () => {
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      ...draft,
      accountId: null,
    } as never);

    await expect(
      verifyImportDraftProjectionForRowIds(
        'org_1',
        'batch-1',
        ['row-1'],
        mockTx
      )
    ).rejects.toBeInstanceOf(DomainError);
  });
});
