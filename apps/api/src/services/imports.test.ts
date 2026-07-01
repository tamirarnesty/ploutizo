import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@ploutizo/db';
import {
  createNormalizedImportDraft,
  listImportTargets,
  updateImportDraftRow,
} from '@/services/imports';
import {
  fetchActiveCreditCardAccount,
  fetchActiveDraftByAccount,
  fetchDraftRowById,
  fetchDraftSummaryById,
  insertImportBatch,
  insertImportBatchRows,
  listDraftRows,
  listImportTargetAccounts,
  touchImportDraft,
  updateImportDraftRowQuery,
} from '@/lib/queries/imports';

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(),
  },
}));

vi.mock('@/lib/queries/imports', () => ({
  fetchActiveCreditCardAccount: vi.fn(),
  fetchActiveDraftByAccount: vi.fn(),
  fetchDraftRowById: vi.fn(),
  fetchDraftSummaryById: vi.fn(),
  insertImportBatch: vi.fn(),
  insertImportBatchRows: vi.fn(),
  listDraftRows: vi.fn(),
  listImportTargetAccounts: vi.fn(),
  touchImportDraft: vi.fn(),
  updateImportDraftRowQuery: vi.fn(),
}));

const summaryRow = {
  id: '11111111-1111-4111-8111-111111111111',
  accountId: '22222222-2222-4222-8222-222222222222',
  accountName: 'Visa',
  accountInstitution: 'TD',
  accountLastFour: '1234',
  source: 'ploutizo_normalized',
  status: 'draft' as const,
  fileName: 'statement.csv',
  rowCount: 2,
  validRowCount: 1,
  invalidRowCount: 1,
  importedAt: new Date('2026-05-20T12:00:00Z'),
  completedAt: null,
  discardedAt: null,
  createdAt: new Date('2026-05-20T12:00:00Z'),
  updatedAt: new Date('2026-05-20T12:00:00Z'),
};

const draftRow = {
  id: '33333333-3333-4333-8333-333333333333',
  batchId: summaryRow.id,
  orgId: 'org_1',
  rowNumber: 2,
  status: 'ready' as const,
  invalidReason: null,
  rawData: { date: '2026-05-02' },
  externalId: 'visa-1001',
  sourceDate: '2026-05-02',
  sourceAmount: '42.18',
  sourceDescription: 'Coffee',
  sourceType: 'expense',
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense' as const,
  parsedDescription: 'Coffee',
  reviewDate: '2026-05-02',
  reviewAmount: 4218,
  reviewType: 'expense' as const,
  reviewDescription: 'Coffee',
  reviewCategoryName: 'Dining',
  reviewAssigneeHint: null,
  reviewRefundLinkHint: null,
  reviewNotes: null,
  reviewTags: [],
  selectedForImport: false,
  createdAt: new Date('2026-05-20T12:00:00Z'),
  updatedAt: new Date('2026-05-20T12:00:00Z'),
};

describe('import service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn({} as never));
    vi.mocked(fetchActiveCreditCardAccount).mockResolvedValue({
      id: summaryRow.accountId,
    });
    vi.mocked(fetchActiveDraftByAccount).mockResolvedValue(null);
    vi.mocked(fetchDraftSummaryById).mockResolvedValue(summaryRow);
    vi.mocked(listDraftRows).mockResolvedValue([draftRow]);
    vi.mocked(insertImportBatch).mockResolvedValue({
      id: summaryRow.id,
    } as never);
    vi.mocked(insertImportBatchRows).mockResolvedValue([]);
  });

  it('returns credit-card target accounts without owner enrichment', async () => {
    vi.mocked(listImportTargetAccounts).mockResolvedValue([
      {
        id: summaryRow.accountId,
        name: 'Visa',
        institution: 'TD',
        lastFour: '1234',
      },
    ]);

    await expect(listImportTargets('org_1')).resolves.toEqual([
      {
        id: summaryRow.accountId,
        name: 'Visa',
        institution: 'TD',
        lastFour: '1234',
      },
    ]);
  });

  it('persists a normalized draft and every parsed row in one transaction', async () => {
    const result = await createNormalizedImportDraft('org_1', {
      accountId: summaryRow.accountId,
      fileName: 'statement.csv',
      content: [
        'date,amount,description,type,category',
        '2026-05-02,42.18,Coffee,expense,Dining',
        'bad,nope,,wat,',
      ].join('\n'),
    });

    expect(result.reusedExisting).toBe(false);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(insertImportBatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orgId: 'org_1',
        accountId: summaryRow.accountId,
        source: 'ploutizo_normalized',
        status: 'draft',
        fileName: 'statement.csv',
        rowCount: 2,
        validRowCount: 1,
        invalidRowCount: 1,
      })
    );
    expect(insertImportBatchRows).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          batchId: summaryRow.id,
          orgId: 'org_1',
          status: 'ready',
          reviewDescription: 'Coffee',
        }),
        expect.objectContaining({
          batchId: summaryRow.id,
          orgId: 'org_1',
          status: 'invalid',
          invalidReason: expect.stringContaining('Date must be'),
        }),
      ])
    );
    expect(result.draft.rows).toHaveLength(1);
  });

  it('resumes the active draft for an account without inserting a new batch', async () => {
    vi.mocked(fetchActiveDraftByAccount).mockResolvedValue(summaryRow);

    const result = await createNormalizedImportDraft('org_1', {
      accountId: summaryRow.accountId,
      fileName: 'new.csv',
      content: 'date,amount,description,type\n2026-05-02,42.18,Coffee,expense',
    });

    expect(result.reusedExisting).toBe(true);
    expect(insertImportBatch).not.toHaveBeenCalled();
    expect(insertImportBatchRows).not.toHaveBeenCalled();
  });

  it('returns the raced draft when concurrent uploads hit the unique draft index', async () => {
    vi.mocked(db.transaction).mockRejectedValueOnce({ code: '23505' });
    vi.mocked(fetchActiveDraftByAccount).mockResolvedValueOnce(null);
    vi.mocked(fetchActiveDraftByAccount).mockResolvedValueOnce(summaryRow);

    const result = await createNormalizedImportDraft('org_1', {
      accountId: summaryRow.accountId,
      fileName: 'statement.csv',
      content: 'date,amount,description,type\n2026-05-02,42.18,Coffee,expense',
    });

    expect(result.reusedExisting).toBe(true);
    expect(result.draft.id).toBe(summaryRow.id);
  });

  it('recomputes row status to ready when category is patched onto a needs_review row', async () => {
    const needsReviewRow = {
      ...draftRow,
      status: 'needs_review' as const,
      reviewCategoryName: null,
    };
    const updatedRow = {
      ...needsReviewRow,
      reviewCategoryName: 'Dining',
      status: 'ready' as const,
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };

    vi.mocked(fetchDraftRowById).mockResolvedValue(needsReviewRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);

    const result = await updateImportDraftRow('org_1', draftRow.id, {
      reviewCategoryName: 'Dining',
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      {
        reviewCategoryName: 'Dining',
        status: 'ready',
      }
    );
    expect(touchImportDraft).toHaveBeenCalledWith('org_1', summaryRow.id);
    expect(result.status).toBe('ready');
  });

  it('persists row selection updates', async () => {
    vi.mocked(fetchDraftRowById).mockResolvedValue(draftRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue({
      ...draftRow,
      selectedForImport: true,
    });

    const result = await updateImportDraftRow('org_1', draftRow.id, {
      selectedForImport: true,
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      expect.objectContaining({ selectedForImport: true })
    );
    expect(result.selectedForImport).toBe(true);
  });
});
