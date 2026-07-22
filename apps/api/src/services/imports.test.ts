import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@ploutizo/db';
import {
  createNormalizedImportDraft,
  listImportTargets,
  updateImportDraftRow,
  updateImportDraftRowSelection,
} from '@/services/imports';
import {
  adjustImportDraftRowCounts,
  fetchActiveCreditCardAccount,
  fetchActiveDraftByAccount,
  fetchDraftRowById,
  fetchDraftSummaryById,
  insertImportBatch,
  insertImportBatchRows,
  listDraftRowIdsForDraft,
  listDraftRows,
  listImportTargetAccounts,
  touchImportDraft,
  updateImportDraftRowQuery,
  updateImportDraftRowSelectionQuery,
} from '@/lib/queries/imports';
import { assertOrgWriteReferences } from '@/lib/assertOrgWriteReferences';
import { listOrgMembers } from '@/lib/queries/households';
import { listCategories } from '@/lib/queries/categories';
import { listTags } from '@/lib/queries/tags';

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
  listDraftRowIdsForDraft: vi.fn(),
  listImportTargetAccounts: vi.fn(),
  adjustImportDraftRowCounts: vi.fn(),
  touchImportDraft: vi.fn(),
  updateImportDraftRowQuery: vi.fn(),
  updateImportDraftRowSelectionQuery: vi.fn(),
}));

vi.mock('@/lib/queries/households', () => ({
  listOrgMembers: vi.fn(),
}));

vi.mock('@/lib/queries/categories', () => ({
  listCategories: vi.fn(),
}));

vi.mock('@/lib/queries/tags', () => ({
  listTags: vi.fn(),
}));

vi.mock('@/lib/assertOrgWriteReferences', () => ({
  assertOrgWriteReferences: vi.fn(),
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
  reviewCategoryId: '55555555-5555-4555-8555-555555555555',
  reviewAssigneeMemberIds: ['44444444-4444-4444-8444-444444444444'],
  reviewRefundLinkHint: null,
  reviewNotes: null,
  reviewTagIds: [],
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
    vi.mocked(listOrgMembers).mockResolvedValue([
      {
        id: '44444444-4444-4444-8444-444444444444',
        orgId: 'org_1',
        displayName: 'Tamir Arnesty',
        role: 'admin',
        joinedAt: new Date('2026-01-01T00:00:00Z'),
        externalId: 'user_1',
        imageUrl: null,
        firstName: 'Tamir',
        lastName: 'Arnesty',
      },
    ]);
    vi.mocked(listCategories).mockResolvedValue([
      {
        id: '55555555-5555-4555-8555-555555555555',
        orgId: 'org_1',
        name: 'Dining',
        icon: null,
        colour: null,
        sortOrder: 0,
        archivedAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    vi.mocked(listTags).mockResolvedValue([]);
    vi.mocked(assertOrgWriteReferences).mockResolvedValue(undefined);
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
        'date,amount,description,type,category,assignee hint',
        '2026-05-02,42.18,Coffee,expense,Dining,Tamir Arnesty',
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
          reviewCategoryId: '55555555-5555-4555-8555-555555555555',
          reviewAssigneeMemberIds: ['44444444-4444-4444-8444-444444444444'],
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
      reviewCategoryId: null,
    };
    const updatedRow = {
      ...needsReviewRow,
      reviewCategoryId: '55555555-5555-4555-8555-555555555555',
      status: 'ready' as const,
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };
    const tx = {} as never;

    vi.mocked(fetchDraftRowById).mockResolvedValue(needsReviewRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx));

    const result = await updateImportDraftRow('org_1', draftRow.id, {
      reviewCategoryId: '55555555-5555-4555-8555-555555555555',
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      {
        reviewCategoryId: '55555555-5555-4555-8555-555555555555',
        status: 'ready',
      },
      tx
    );
    expect(adjustImportDraftRowCounts).toHaveBeenCalledWith(
      'org_1',
      summaryRow.id,
      { validRowCount: 0, invalidRowCount: 0 },
      tx
    );
    expect(result.status).toBe('ready');
  });

  it('recomputes invalid row to needs_review when core review fields are patched', async () => {
    const invalidRow = {
      ...draftRow,
      status: 'invalid' as const,
      invalidReason: 'Date must be a valid YYYY-MM-DD value.',
      parsedDate: null,
      parsedAmount: null,
      parsedType: null,
      parsedDescription: null,
      reviewDate: null,
      reviewAmount: null,
      reviewType: null,
      reviewDescription: null,
      reviewCategoryId: null,
      reviewAssigneeMemberIds: [],
    };
    const updatedRow = {
      ...invalidRow,
      reviewDate: '2026-05-02',
      reviewAmount: 4218,
      reviewType: 'expense' as const,
      reviewDescription: 'Coffee',
      status: 'needs_review' as const,
      invalidReason: null,
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };
    const tx = {} as never;

    vi.mocked(fetchDraftRowById).mockResolvedValue(invalidRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx));

    const result = await updateImportDraftRow('org_1', draftRow.id, {
      reviewDate: '2026-05-02',
      reviewAmount: 4218,
      reviewType: 'expense',
      reviewDescription: 'Coffee',
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      {
        reviewDate: '2026-05-02',
        reviewAmount: 4218,
        reviewType: 'expense',
        reviewDescription: 'Coffee',
        status: 'needs_review',
        invalidReason: null,
      },
      tx
    );
    expect(adjustImportDraftRowCounts).toHaveBeenCalledWith(
      'org_1',
      summaryRow.id,
      { validRowCount: 1, invalidRowCount: -1 },
      tx
    );
    expect(result.status).toBe('needs_review');
  });

  it('adjusts draft counts when a valid row becomes invalid', async () => {
    const reviewOnlyRow = {
      ...draftRow,
      status: 'needs_review' as const,
      parsedDate: null,
      parsedAmount: null,
      parsedType: null,
      parsedDescription: null,
      reviewCategoryId: null,
      reviewAssigneeMemberIds: [],
    };
    const updatedRow = {
      ...reviewOnlyRow,
      reviewDate: null,
      status: 'invalid' as const,
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };
    const tx = {} as never;

    vi.mocked(fetchDraftRowById).mockResolvedValue(reviewOnlyRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx));

    const result = await updateImportDraftRow('org_1', draftRow.id, {
      reviewDate: null,
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      {
        reviewDate: null,
        status: 'invalid',
      },
      tx
    );
    expect(adjustImportDraftRowCounts).toHaveBeenCalledWith(
      'org_1',
      summaryRow.id,
      { validRowCount: -1, invalidRowCount: 1 },
      tx
    );
    expect(result.status).toBe('invalid');
  });

  it('persists row selection updates', async () => {
    const tx = {} as never;

    vi.mocked(fetchDraftRowById).mockResolvedValue(draftRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue({
      ...draftRow,
      selectedForImport: true,
    });
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx));

    const result = await updateImportDraftRow('org_1', draftRow.id, {
      selectedForImport: true,
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      expect.objectContaining({ selectedForImport: true }),
      tx
    );
    expect(adjustImportDraftRowCounts).toHaveBeenCalledWith(
      'org_1',
      summaryRow.id,
      { validRowCount: 0, invalidRowCount: 0 },
      tx
    );
    expect(result.selectedForImport).toBe(true);
  });

  it('updates row selection in batch for a draft', async () => {
    vi.mocked(fetchDraftSummaryById).mockResolvedValue(summaryRow);
    vi.mocked(listDraftRowIdsForDraft).mockResolvedValue([{ id: draftRow.id }]);
    vi.mocked(updateImportDraftRowSelectionQuery).mockResolvedValue([
      { ...draftRow, selectedForImport: true },
    ]);
    const tx = {} as never;
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx));

    const result = await updateImportDraftRowSelection('org_1', summaryRow.id, {
      rowIds: [draftRow.id],
      selectedForImport: true,
    });

    expect(updateImportDraftRowSelectionQuery).toHaveBeenCalledWith(
      'org_1',
      summaryRow.id,
      [draftRow.id],
      true,
      tx
    );
    expect(touchImportDraft).toHaveBeenCalledWith('org_1', summaryRow.id, tx);
    expect(result).toHaveLength(1);
    expect(result[0]?.selectedForImport).toBe(true);
  });
});
