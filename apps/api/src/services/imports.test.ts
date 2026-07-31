import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@ploutizo/db';
import { NotFoundError } from '@/lib/errors';
import {
  createNormalizedImportDraft,
  getImportDraft,
  listImportTargets,
  updateImportDraftRow,
  updateImportDraftRowSelection,
} from '@/services/imports';
import {
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
import { listRefundTargetExpensesByIds } from '@/lib/queries/import-refund-targets';
import { assertOrgWriteReferences } from '@/lib/assertOrgWriteReferences';
import { listOrgMembers } from '@/lib/queries/households';
import { listCategories } from '@/lib/queries/categories';
import {
  fetchAccountWriteReference,
  transactionExistsInOrg,
} from '@/lib/queries/scope';
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
  touchImportDraft: vi.fn(),
  updateImportDraftRowQuery: vi.fn(),
  updateImportDraftRowSelectionQuery: vi.fn(),
}));

vi.mock('@/lib/queries/import-refund-targets', () => ({
  listRefundTargetExpensesByIds: vi.fn(),
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

vi.mock('@/lib/queries/scope', () => ({
  fetchAccountWriteReference: vi.fn(),
  transactionExistsInOrg: vi.fn(),
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
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
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
    vi.mocked(listRefundTargetExpensesByIds).mockResolvedValue(new Map());
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
    vi.mocked(fetchAccountWriteReference).mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      type: 'chequing',
    });
    vi.mocked(transactionExistsInOrg).mockResolvedValue(true);
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
    expect(result.draft.validRowCount).toBe(1);
    expect(result.draft.invalidRowCount).toBe(0);
  });

  it('derives row status on GET without persisting recomputation', async () => {
    const needsReviewRow = {
      ...draftRow,
      status: 'needs_review' as const,
      reviewCategoryId: null,
    };
    vi.mocked(listDraftRows).mockResolvedValue([needsReviewRow]);

    const draft = await getImportDraft('org_1', summaryRow.id);

    expect(draft.rows[0]?.status).toBe('needs_review');
    expect(draft.validRowCount).toBe(1);
    expect(draft.invalidRowCount).toBe(0);
    expect(listRefundTargetExpensesByIds).toHaveBeenCalledWith('org_1', []);
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

  it('derives ready status when category is patched onto a needs_review row', async () => {
    const needsReviewRow = {
      ...draftRow,
      status: 'needs_review' as const,
      reviewCategoryId: null,
    };
    const updatedRow = {
      ...needsReviewRow,
      reviewCategoryId: '55555555-5555-4555-8555-555555555555',
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };

    vi.mocked(fetchDraftRowById).mockResolvedValue(needsReviewRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);
    vi.mocked(listDraftRows).mockResolvedValue([updatedRow]);

    const result = await updateImportDraftRow('org_1', draftRow.id, {
      reviewCategoryId: '55555555-5555-4555-8555-555555555555',
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      {
        reviewCategoryId: '55555555-5555-4555-8555-555555555555',
      }
    );
    expect(result.status).toBe('ready');
  });

  it('derives needs_review when core review fields are patched onto an invalid row', async () => {
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
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };

    vi.mocked(fetchDraftRowById).mockResolvedValue(invalidRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);
    vi.mocked(listDraftRows).mockResolvedValue([updatedRow]);

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
      }
    );
    expect(result.status).toBe('needs_review');
    expect(result.invalidReason).toBeNull();
  });

  it('derives invalidReason when an invalid row stays invalid after partial correction', async () => {
    const invalidRow = {
      ...draftRow,
      status: 'invalid' as const,
      invalidReason:
        'Date must be a valid YYYY-MM-DD value. Amount must be a positive number.',
      parsedDate: null,
      parsedAmount: null,
      parsedType: 'expense' as const,
      parsedDescription: 'Coffee',
      reviewDate: null,
      reviewAmount: null,
      reviewType: 'expense' as const,
      reviewDescription: 'Coffee',
      reviewCategoryId: null,
      reviewAssigneeMemberIds: [],
    };
    const updatedRow = {
      ...invalidRow,
      reviewDate: '2026-05-02',
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };

    vi.mocked(fetchDraftRowById).mockResolvedValue(invalidRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);
    vi.mocked(listDraftRows).mockResolvedValue([updatedRow]);

    const result = await updateImportDraftRow('org_1', draftRow.id, {
      reviewDate: '2026-05-02',
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      {
        reviewDate: '2026-05-02',
      }
    );
    expect(result.status).toBe('invalid');
    expect(result.invalidReason).toBe('Amount must be a positive number.');
  });

  it('derives invalid status when a row loses required review fields', async () => {
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
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };

    vi.mocked(fetchDraftRowById).mockResolvedValue(reviewOnlyRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);
    vi.mocked(listDraftRows).mockResolvedValue([updatedRow]);

    const result = await updateImportDraftRow('org_1', draftRow.id, {
      reviewDate: null,
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      {
        reviewDate: null,
      }
    );
    expect(result.status).toBe('invalid');
    expect(result.invalidReason).toBe('Date must be a valid YYYY-MM-DD value.');
  });

  it('persists row field updates without writing derived status columns', async () => {
    const updatedRow = {
      ...draftRow,
      reviewNotes: 'memo',
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };

    vi.mocked(fetchDraftRowById).mockResolvedValue(draftRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);
    vi.mocked(listDraftRows).mockResolvedValue([updatedRow]);

    const result = await updateImportDraftRow('org_1', draftRow.id, {
      reviewNotes: 'memo',
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      {
        reviewNotes: 'memo',
      }
    );
    expect(result.reviewNotes).toBe('memo');
    expect(result.status).toBe('ready');
  });

  it('updates row selection in batch for a draft and returns derived rows', async () => {
    vi.mocked(fetchDraftSummaryById).mockResolvedValue(summaryRow);
    vi.mocked(listDraftRowIdsForDraft).mockResolvedValue([{ id: draftRow.id }]);
    vi.mocked(updateImportDraftRowSelectionQuery).mockResolvedValue([
      { ...draftRow, selectedForImport: true },
    ]);
    vi.mocked(listDraftRows).mockResolvedValue([
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

  it('derives needs_review when sibling refunds make cumulative total exceed target', async () => {
    const expenseId = '77777777-7777-4777-8777-777777777777';
    const siblingRefundRow = {
      ...draftRow,
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      rowNumber: 1,
      reviewType: 'refund' as const,
      parsedType: 'refund' as const,
      reviewAmount: 3000,
      parsedAmount: 3000,
      reviewRefundOf: expenseId,
      reviewCategoryId: null,
      reviewAssigneeMemberIds: [],
      selectedForImport: true,
    };
    const refundRow = {
      ...draftRow,
      reviewType: 'refund' as const,
      parsedType: 'refund' as const,
      reviewAmount: 2500,
      parsedAmount: 2500,
      reviewRefundOf: expenseId,
      reviewCategoryId: null,
      reviewAssigneeMemberIds: [],
      selectedForImport: true,
    };
    const updatedRefundRow = {
      ...refundRow,
      reviewCategoryId: '55555555-5555-4555-8555-555555555555',
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };

    vi.mocked(fetchDraftRowById).mockResolvedValue(refundRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRefundRow);
    vi.mocked(listDraftRows).mockResolvedValue([siblingRefundRow, updatedRefundRow]);
    vi.mocked(listRefundTargetExpensesByIds).mockResolvedValue(
      new Map([
        [
          expenseId,
          {
            id: expenseId,
            accountId: summaryRow.accountId,
            amount: 5000,
            categoryId: '55555555-5555-4555-8555-555555555555',
            assigneeMemberIds: ['44444444-4444-4444-8444-444444444444'],
            type: 'expense',
            deleted: false,
          },
        ],
      ])
    );

    const result = await updateImportDraftRow('org_1', refundRow.id, {
      reviewCategoryId: '55555555-5555-4555-8555-555555555555',
    });

    expect(listDraftRows).toHaveBeenCalledWith('org_1', summaryRow.id);
    expect(result.status).toBe('needs_review');
  });

  it('persists settlement funding and refund-link review values', async () => {
    const fundingId = '66666666-6666-4666-8666-666666666666';
    const expenseId = '77777777-7777-4777-8777-777777777777';
    const settlementRow = {
      ...draftRow,
      reviewType: 'settlement' as const,
      reviewCategoryId: null,
      reviewAssigneeMemberIds: [],
    };
    const updatedRow = {
      ...settlementRow,
      reviewCounterpartAccountId: fundingId,
      reviewRefundOf: expenseId,
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };
    const tx = {} as never;

    vi.mocked(fetchDraftRowById).mockResolvedValue(settlementRow);
    vi.mocked(fetchDraftSummaryById).mockResolvedValue(summaryRow);
    vi.mocked(fetchAccountWriteReference).mockImplementation((_org, id) =>
      Promise.resolve(
        id === summaryRow.accountId
          ? { id: summaryRow.accountId, type: 'credit_card' }
          : { id: fundingId, type: 'chequing' }
      )
    );
    vi.mocked(transactionExistsInOrg).mockResolvedValue(true);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);
    vi.mocked(listDraftRows).mockResolvedValue([updatedRow]);
    vi.mocked(listRefundTargetExpensesByIds).mockResolvedValue(
      new Map([
        [
          expenseId,
          {
            id: expenseId,
            accountId: summaryRow.accountId,
            amount: 5000,
            categoryId: '55555555-5555-4555-8555-555555555555',
            assigneeMemberIds: ['44444444-4444-4444-8444-444444444444'],
            type: 'expense',
            deleted: false,
          },
        ],
      ])
    );
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx));

    const result = await updateImportDraftRow('org_1', draftRow.id, {
      reviewCounterpartAccountId: fundingId,
      reviewRefundOf: expenseId,
    });

    expect(fetchAccountWriteReference).toHaveBeenCalledWith('org_1', fundingId);
    expect(transactionExistsInOrg).toHaveBeenCalledWith('org_1', expenseId);
    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      {
        reviewCounterpartAccountId: fundingId,
        reviewRefundOf: expenseId,
      }
    );
    expect(result).toMatchObject({
      reviewCounterpartAccountId: fundingId,
      reviewRefundOf: expenseId,
      externalId: settlementRow.externalId,
      sourceDate: settlementRow.sourceDate,
      sourceAmount: settlementRow.sourceAmount,
      sourceDescription: settlementRow.sourceDescription,
      sourceType: settlementRow.sourceType,
      parsedDate: settlementRow.parsedDate,
      parsedAmount: settlementRow.parsedAmount,
      parsedType: settlementRow.parsedType,
      parsedDescription: settlementRow.parsedDescription,
      status: 'needs_review',
    });
  });

  it('rejects reviewCounterpartAccountId not in org (two-org isolation)', async () => {
    const fundingId = '66666666-6666-4666-8666-666666666666';
    vi.mocked(fetchDraftRowById).mockResolvedValue(draftRow);
    vi.mocked(fetchAccountWriteReference).mockResolvedValue(null);

    const err = await updateImportDraftRow('org_1', draftRow.id, {
      reviewCounterpartAccountId: fundingId,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Account not found');
    expect(fetchAccountWriteReference).toHaveBeenCalledWith('org_1', fundingId);
    expect(updateImportDraftRowQuery).not.toHaveBeenCalled();
  });

  it('rejects reviewRefundOf not in org (two-org isolation)', async () => {
    const expenseId = '77777777-7777-4777-8777-777777777777';
    vi.mocked(fetchDraftRowById).mockResolvedValue(draftRow);
    vi.mocked(transactionExistsInOrg).mockResolvedValue(false);

    const err = await updateImportDraftRow('org_1', draftRow.id, {
      reviewRefundOf: expenseId,
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as NotFoundError).message).toBe('Transaction not found');
    expect(transactionExistsInOrg).toHaveBeenCalledWith('org_1', expenseId);
    expect(updateImportDraftRowQuery).not.toHaveBeenCalled();
  });
});
