import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@ploutizo/db';
import {
  createNormalizedImportDraft,
  listImportTargets,
} from '@/services/imports';
import { listAccountMemberDetails } from '@/lib/queries/accounts';
import {
  fetchActiveCreditCardAccount,
  fetchActiveDraftByAccount,
  fetchDraftSummaryById,
  insertImportBatch,
  insertImportBatchRows,
  listDraftRows,
  listImportTargetAccounts,
} from '@/lib/queries/imports';

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(),
  },
}));

vi.mock('@/lib/queries/accounts', () => ({
  listAccountMemberDetails: vi.fn(),
}));

vi.mock('@/lib/queries/imports', () => ({
  fetchActiveCreditCardAccount: vi.fn(),
  fetchActiveDraftByAccount: vi.fn(),
  fetchDraftSummaryById: vi.fn(),
  insertImportBatch: vi.fn(),
  insertImportBatchRows: vi.fn(),
  listDraftRows: vi.fn(),
  listImportTargetAccounts: vi.fn(),
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
    vi.mocked(insertImportBatch).mockResolvedValue({ id: summaryRow.id } as never);
    vi.mocked(insertImportBatchRows).mockResolvedValue([]);
  });

  it('returns only target rows supplied by the credit-card target query with owners attached', async () => {
    vi.mocked(listImportTargetAccounts).mockResolvedValue([
      {
        id: summaryRow.accountId,
        name: 'Visa',
        institution: 'TD',
        lastFour: '1234',
      },
    ]);
    vi.mocked(listAccountMemberDetails).mockResolvedValue([
      {
        accountId: summaryRow.accountId,
        memberId: 'member_1',
        displayName: 'Ada Lovelace',
        imageUrl: null,
      },
    ]);

    await expect(listImportTargets('org_1')).resolves.toEqual([
      {
        id: summaryRow.accountId,
        name: 'Visa',
        institution: 'TD',
        lastFour: '1234',
        owners: [
          {
            id: 'member_1',
            displayName: 'Ada Lovelace',
            imageUrl: null,
          },
        ],
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
});
