import { beforeEach, describe, expect, it, vi } from 'vitest';
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
