import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportDraftDurableRow } from '@ploutizo/utils';
import type { ImportSetFacts } from '@ploutizo/utils/import-set-verification';
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

const expenseRow = (): ImportDraftDurableRow => ({
  id: 'row-1',
  reviewDate: '2026-05-02',
  reviewAmount: 4218,
  reviewType: 'expense',
  reviewDescription: 'Coffee',
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense',
  parsedDescription: 'Coffee',
  reviewCategoryId: 'cat-1',
  reviewAssigneeMemberIds: ['member-1'],
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: null,
  selectedForImport: true,
  reviewMatchedTransactionId: null,
  reviewMatchDismissed: false,
  externalId: null,
  sourceDescription: null,
});

const readyFacts = (): ImportSetFacts => ({
  rowCount: 1,
  rows: [expenseRow()],
  targetAccount: { id: 'account-1', type: 'credit_card' },
  counterpartAccounts: new Map(),
  validAssigneeMemberIds: new Set(['member-1']),
  existingTransactions: [],
  existingExpenses: new Map(),
  priorRefundsByTarget: new Map(),
  activeExternalIdOwners: new Map(),
});

describe('verifyImportSetForDraft', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fetchDraftSummaryById).mockResolvedValue(draft as never);
    vi.mocked(listDraftRows).mockResolvedValue([
      { id: 'row-1', batchId: 'batch-1' },
    ] as never);
    vi.mocked(loadImportSetFacts).mockResolvedValue(readyFacts());
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

  it('loads facts and returns verifyImportSet projection when ready', async () => {
    const draftRows = [{ id: 'row-1', batchId: 'batch-1' }];
    const result = await verifyImportSetForDraft(mockTx, {
      orgId: 'org_1',
      batchId: 'batch-1',
      rowIds: ['row-1'],
    });

    expect(loadImportSetFacts).toHaveBeenCalledWith(mockTx, {
      orgId: 'org_1',
      accountId: 'account-1',
      rowCount: 1,
      draftRows,
      selectedRowIds: new Set(['row-1']),
    });
    expect(result).toEqual({
      ready: true,
      draft: { ...draft, accountId: 'account-1' },
      projection: [
        expect.objectContaining({
          batchRowId: 'row-1',
          outcome: 'created',
        }),
      ],
    });
  });

  it('returns structured failures when verification is not ready', async () => {
    vi.mocked(loadImportSetFacts).mockResolvedValue({
      ...readyFacts(),
      rows: [{ ...expenseRow(), reviewCategoryId: null }],
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
});
