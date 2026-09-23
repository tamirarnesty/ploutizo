import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@ploutizo/db';
import { DomainError, NotFoundError } from '@/lib/errors';
import { updateImportDraftRows } from '@/services/imports';
import {
  fetchDraftSummaryById,
  listDraftRows,
  lockImportDraftBatch,
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
  lockImportDraftBatch: vi.fn(),
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

    expect(lockImportDraftBatch).toHaveBeenCalledWith(
      {},
      'org_1',
      summaryRow.id
    );
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

  it('rejects a cross-account match without persisting', async () => {
    vi.mocked(transactionExistsOnAccount).mockResolvedValue(false);

    await expect(
      updateImportDraftRows('org_1', summaryRow.id, {
        rows: [
          {
            id: draftRow.id,
            reviewMatchedTransactionId: '66666666-6666-4666-8666-666666666666',
          },
        ],
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(updateImportDraftRowQuery).not.toHaveBeenCalled();
  });

  it('returns refundTargetFacts when reviewRefundOf is patched', async () => {
    const refundTargetId = '77777777-7777-4777-8777-777777777777';
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue({
      ...draftRow,
      reviewRefundOf: refundTargetId,
    });
    vi.mocked(listRefundTargetExpensesByIds).mockResolvedValue(
      new Map([
        [
          refundTargetId,
          {
            id: refundTargetId,
            accountId: summaryRow.accountId,
            amount: 4218,
            categoryId: draftRow.reviewCategoryId,
            assigneeMemberIds: draftRow.reviewAssigneeMemberIds,
            type: 'expense',
            deleted: false,
          },
        ],
      ])
    );

    const result = await updateImportDraftRows('org_1', summaryRow.id, {
      rows: [{ id: draftRow.id, reviewRefundOf: refundTargetId }],
    });

    expect(result.refundTargetFacts?.[refundTargetId]).toMatchObject({
      id: refundTargetId,
    });
  });

  it('rejects duplicate row ids in one batch', async () => {
    await expect(
      updateImportDraftRows('org_1', summaryRow.id, {
        rows: [
          { id: draftRow.id, reviewNotes: 'a' },
          { id: draftRow.id, reviewNotes: 'b' },
        ],
      })
    ).rejects.toBeInstanceOf(DomainError);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('aborts the batch when persistence fails inside the transaction', async () => {
    const rowB = { ...draftRow, id: '44444444-4444-4444-8444-444444444444' };
    vi.mocked(listDraftRows).mockResolvedValue([draftRow, rowB]);
    vi.mocked(updateImportDraftRowQuery)
      .mockResolvedValueOnce({ ...draftRow, reviewNotes: 'a' })
      .mockRejectedValueOnce(new Error('persist failed'));

    await expect(
      updateImportDraftRows('org_1', summaryRow.id, {
        rows: [
          { id: draftRow.id, reviewNotes: 'a' },
          { id: rowB.id, reviewNotes: 'b' },
        ],
      })
    ).rejects.toThrow('persist failed');

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(updateImportDraftRowQuery).toHaveBeenCalledTimes(2);
  });

  it('loads and validates rows only after taking the draft lock', async () => {
    const order: string[] = [];
    vi.mocked(lockImportDraftBatch).mockImplementation(async () => {
      order.push('lock');
    });
    vi.mocked(listDraftRows).mockImplementation(async () => {
      order.push('load');
      return [draftRow];
    });
    vi.mocked(assertOrgWriteReferences).mockImplementation(async () => {
      order.push('validate');
    });
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(draftRow);

    await updateImportDraftRows('org_1', summaryRow.id, {
      rows: [{ id: draftRow.id, reviewNotes: 'a' }],
    });

    expect(order).toEqual(['lock', 'load', 'validate']);
  });

  it('reads refund target facts inside the locked transaction', async () => {
    const tx = { id: 'tx' };
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx as never));
    const refundTargetId = '77777777-7777-4777-8777-777777777777';
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue({
      ...draftRow,
      reviewRefundOf: refundTargetId,
    });

    await updateImportDraftRows('org_1', summaryRow.id, {
      rows: [{ id: draftRow.id, reviewRefundOf: refundTargetId }],
    });

    expect(listRefundTargetExpensesByIds).toHaveBeenCalledWith(
      'org_1',
      [refundTargetId],
      tx
    );
  });

  it('rejects a same-import refund target that is not on this draft', async () => {
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

    expect(updateImportDraftRowQuery).not.toHaveBeenCalled();
  });
});
