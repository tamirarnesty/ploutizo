import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@ploutizo/db';
import { NotFoundError } from '@/lib/errors';
import { updateImportDraftRows } from '@/services/imports';
import {
  fetchDraftRowById,
  fetchDraftSummaryById,
  listDraftRows,
  updateImportDraftRowQuery,
} from '@/lib/queries/imports';
import { assertOrgWriteReferences } from '@/lib/assertOrgWriteReferences';
import { listRefundTargetExpensesByIds } from '@/lib/queries/import-refund-targets';
import {
  fetchAccountWriteReference,
  transactionExistsInOrg,
  transactionExistsOnAccount,
} from '@/lib/queries/scope';
import { listOrgMembers } from '@/lib/queries/households';

vi.mock('@ploutizo/db', () => ({
  db: { transaction: vi.fn() },
}));

vi.mock('@/lib/queries/imports', () => ({
  fetchDraftSummaryById: vi.fn(),
  listDraftRows: vi.fn(),
  fetchDraftRowById: vi.fn(),
  updateImportDraftRowQuery: vi.fn(),
}));

vi.mock('@/lib/queries/import-refund-targets', () => ({
  listRefundTargetExpensesByIds: vi.fn(),
}));

vi.mock('@/lib/assertOrgWriteReferences', () => ({
  assertOrgWriteReferences: vi.fn(),
}));

vi.mock('@/lib/queries/scope', () => ({
  fetchAccountWriteReference: vi.fn(),
  transactionExistsInOrg: vi.fn(),
  transactionExistsOnAccount: vi.fn(),
}));

vi.mock('@/lib/queries/households', () => ({
  listOrgMembers: vi.fn(),
}));

const summaryRow = {
  id: '11111111-1111-4111-8111-111111111111',
  accountId: '22222222-2222-4222-8222-222222222222',
  accountName: 'Visa',
  accountInstitutionId: 'td',
  accountLastFour: '1234',
  contentProfileId: null,
  status: 'draft' as const,
  fileName: 'statement.csv',
  rowCount: 1,
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

const draftRow = {
  id: '33333333-3333-4333-8333-333333333333',
  batchId: summaryRow.id,
  orgId: 'org_1',
  rowNumber: 1,
  rawData: { date: '2026-05-02' },
  externalId: null,
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
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: null,
  reviewRefundLinkHint: null,
  reviewMatchedTransactionId: null,
  reviewMatchDismissed: false,
  reviewNotes: null,
  reviewTagIds: [],
  createdAt: new Date('2026-05-20T12:00:00Z'),
  updatedAt: new Date('2026-05-20T12:00:00Z'),
};

describe('updateImportDraftRows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn({} as never));
    vi.mocked(fetchDraftSummaryById).mockResolvedValue(summaryRow);
    vi.mocked(listDraftRows).mockResolvedValue([draftRow]);
    vi.mocked(listRefundTargetExpensesByIds).mockResolvedValue(new Map());
    vi.mocked(listOrgMembers).mockResolvedValue([]);
    vi.mocked(transactionExistsInOrg).mockResolvedValue(true);
    vi.mocked(transactionExistsOnAccount).mockResolvedValue(true);
    vi.mocked(fetchAccountWriteReference).mockResolvedValue({
      id: summaryRow.accountId,
      type: 'credit_card',
      archivedAt: null,
    });
  });

  it('persists multiple row patches in one transaction', async () => {
    const rowB = { ...draftRow, id: '44444444-4444-4444-8444-444444444444' };
    vi.mocked(listDraftRows).mockResolvedValue([draftRow, rowB]);
    vi.mocked(updateImportDraftRowQuery)
      .mockResolvedValueOnce({ ...draftRow, reviewNotes: 'a' })
      .mockResolvedValueOnce({ ...rowB, reviewNotes: 'b' });

    const result = await updateImportDraftRows('org_1', summaryRow.id, {
      rows: [
        { id: draftRow.id, reviewNotes: 'a' },
        { id: rowB.id, reviewNotes: 'b' },
      ],
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledTimes(2);
    expect(result.rows).toHaveLength(2);
    expect(assertOrgWriteReferences).toHaveBeenCalled();
  });

  it('404s when a row id is not on the draft', async () => {
    await expect(
      updateImportDraftRows('org_1', summaryRow.id, {
        rows: [
          { id: '99999999-9999-4999-8999-999999999999', reviewNotes: 'x' },
        ],
      })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(updateImportDraftRowQuery).not.toHaveBeenCalled();
  });

  it('validates each row before opening the transaction', async () => {
    vi.mocked(fetchDraftRowById).mockResolvedValue(null);

    await expect(
      updateImportDraftRows('org_1', summaryRow.id, {
        rows: [
          {
            id: draftRow.id,
            reviewRefundOfBatchRowId: '99999999-9999-4999-8999-999999999999',
          },
        ],
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(db.transaction).not.toHaveBeenCalled();
  });
});
