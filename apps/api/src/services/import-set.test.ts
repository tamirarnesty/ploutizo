import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyImportSet } from '@ploutizo/utils/import-set-verification';
import { DomainError, NotFoundError } from '@/lib/errors';
import { verifyImportSetForDraft } from '@/services/import-set';
import { loadImportSetFacts } from '@/services/import-set-facts';
import { fetchDraftSummaryById, listDraftRows } from '@/lib/queries/imports';

vi.mock('@/lib/queries/imports', () => ({
  fetchDraftSummaryById: vi.fn(),
  listDraftRows: vi.fn(),
}));

vi.mock('@/services/import-set-facts', () => ({
  loadImportSetFacts: vi.fn(),
}));

vi.mock('@ploutizo/utils/import-set-verification', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error(
      'Unexpected @ploutizo/utils/import-set-verification module shape.'
    );
  }
  return {
    ...actual,
    verifyImportSet: vi.fn(),
  };
});

const mockTx = {} as never;
const draft = {
  id: 'batch-1',
  accountId: 'account-1',
  rowCount: 1,
};

describe('verifyImportSetForDraft', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fetchDraftSummaryById).mockResolvedValue(draft as never);
    vi.mocked(listDraftRows).mockResolvedValue([
      { id: 'row-1', batchId: 'batch-1' },
    ] as never);
    vi.mocked(loadImportSetFacts).mockResolvedValue({
      rowCount: 1,
      rows: [],
    } as never);
  });

  it('404s when a row id is not on the draft', async () => {
    await expect(
      verifyImportSetForDraft(mockTx, {
        orgId: 'org_1',
        batchId: 'batch-1',
        rowIds: ['row-missing'],
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns structured failures when verification is not ready', async () => {
    vi.mocked(verifyImportSet).mockReturnValue({
      ready: false,
      failures: [{ batchRowId: 'row-1', key: 'transaction.category.required' }],
    });

    const result = await verifyImportSetForDraft(mockTx, {
      orgId: 'org_1',
      batchId: 'batch-1',
      rowIds: ['row-1'],
    });

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
    vi.mocked(verifyImportSet).mockReturnValue({
      ready: true,
      projection,
    });

    const result = await verifyImportSetForDraft(mockTx, {
      orgId: 'org_1',
      batchId: 'batch-1',
      rowIds: ['row-1'],
    });

    expect(result).toEqual({ ready: true, draft, projection });
  });

  it('500s when the draft has no account', async () => {
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      ...draft,
      accountId: null,
    } as never);

    await expect(
      verifyImportSetForDraft(mockTx, {
        orgId: 'org_1',
        batchId: 'batch-1',
        rowIds: ['row-1'],
      })
    ).rejects.toBeInstanceOf(DomainError);
  });
});
