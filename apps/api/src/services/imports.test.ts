import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@ploutizo/db';
import { deriveImportRowStatus } from '@ploutizo/utils';
import type { ImportRowStatusInput } from '@ploutizo/utils';
import { NotFoundError } from '@/lib/errors';
import {
  createImportDraft,
  getImportDraft,
  listActiveImportDrafts,
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
  listActiveImportDraftSummaries,
  listDraftRowIdsForDraft,
  listDraftRows,
  listDraftRowsForBatches,
  listImportTargetAccounts,
  touchImportDraft,
  updateImportDraftRowQuery,
  updateImportDraftRowSelectionQuery,
} from '@/lib/queries/imports';
import { listRefundTargetExpensesByIds } from '@/lib/queries/import-refund-targets';
import { listImportMatchTargets } from '@/lib/queries/import-match-targets';
import { assertOrgWriteReferences } from '@/lib/assertOrgWriteReferences';
import { listAccountMemberDetails } from '@/lib/queries/accounts';
import { listOrgMembers } from '@/lib/queries/households';
import { listCategories } from '@/lib/queries/categories';
import { listMerchantRulesWithTags } from '@/lib/queries/merchant-rules';
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
  listActiveImportDraftSummaries: vi.fn(),
  listDraftRows: vi.fn(),
  listDraftRowIdsForDraft: vi.fn(),
  listDraftRowsForBatches: vi.fn(),
  listImportTargetAccounts: vi.fn(),
  touchImportDraft: vi.fn(),
  updateImportDraftRowQuery: vi.fn(),
  updateImportDraftRowSelectionQuery: vi.fn(),
}));

vi.mock('@/lib/queries/import-refund-targets', () => ({
  listRefundTargetExpensesByIds: vi.fn(),
}));

vi.mock('@/lib/queries/import-match-targets', () => ({
  listImportMatchTargets: vi.fn(),
}));

vi.mock('@/lib/queries/accounts', () => ({
  listAccountMemberDetails: vi.fn(),
}));

vi.mock('@/lib/queries/households', () => ({
  listOrgMembers: vi.fn(),
}));

vi.mock('@/lib/queries/categories', () => ({
  listCategories: vi.fn(),
}));

vi.mock('@/lib/queries/merchant-rules', () => ({
  listMerchantRulesWithTags: vi.fn(),
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
  accountInstitutionId: 'td',
  accountLastFour: '1234',
  contentProfileId: null,
  status: 'draft' as const,
  fileName: 'statement.csv',
  rowCount: 2,
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
  reviewMatchedTransactionId: null,
  reviewMatchDismissed: false,
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
    vi.mocked(listImportMatchTargets).mockResolvedValue(new Map());
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
    vi.mocked(listMerchantRulesWithTags).mockResolvedValue([]);
    vi.mocked(listAccountMemberDetails).mockResolvedValue([]);
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
        institutionId: 'td',
        lastFour: '1234',
      },
    ]);

    await expect(listImportTargets('org_1')).resolves.toEqual([
      {
        id: summaryRow.accountId,
        name: 'Visa',
        institutionId: 'td',
        lastFour: '1234',
      },
    ]);
  });

  it('persists a normalized draft and every parsed row in one transaction', async () => {
    const result = await createImportDraft('org_1', {
      accountId: summaryRow.accountId,
      fileName: 'statement.csv',
      content: [
        'date,amount,description,type,category,assignee hint',
        '2026-05-02,42.18,Coffee,expense,Dining,Tamir Arnesty',
        'bad,nope,,wat,',
      ].join('\n'),
      selection: { kind: 'profile', profileId: 'internal' },
    });

    expect(result.kind).toBe('draft');
    if (result.kind !== 'draft') return;
    expect(result.meta.reusedExisting).toBe(false);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(insertImportBatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orgId: 'org_1',
        accountId: summaryRow.accountId,
        contentProfileId: 'internal',
        status: 'draft',
        fileName: 'statement.csv',
        rowCount: 2,
      })
    );
    expect(insertImportBatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({
        validRowCount: expect.anything(),
        invalidRowCount: expect.anything(),
      })
    );
    expect(insertImportBatchRows).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          batchId: summaryRow.id,
          orgId: 'org_1',
          reviewDescription: 'Coffee',
          reviewCategoryId: '55555555-5555-4555-8555-555555555555',
          reviewAssigneeMemberIds: ['44444444-4444-4444-8444-444444444444'],
        }),
        expect.objectContaining({
          batchId: summaryRow.id,
          orgId: 'org_1',
          parsedDate: null,
          parsedAmount: null,
          reviewDescription: null,
        }),
      ])
    );
    const insertedRows = vi.mocked(insertImportBatchRows).mock.calls[0][1];
    expect(insertedRows[0]).not.toHaveProperty('status');
    expect(insertedRows[0]).not.toHaveProperty('invalidReason');
    expect(insertedRows[1]).not.toHaveProperty('status');
    expect(insertedRows[1]).not.toHaveProperty('invalidReason');
    expect(insertedRows[0]).not.toHaveProperty('selectedForImport');
    expect(insertedRows[0]).not.toHaveProperty('classificationHint');
    expect(result.data.rows).toHaveLength(1);
    expect(result.data.validRowCount).toBe(1);
    expect(result.data.invalidRowCount).toBe(0);
    expect(listMerchantRulesWithTags).toHaveBeenCalledWith('org_1');
    expect(listAccountMemberDetails).toHaveBeenCalledWith('org_1', [
      summaryRow.accountId,
    ]);
  });

  it('persists a recognized profile upload on the existing draft path', async () => {
    const amexShort = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../lib/imports/parse/fixtures/profiles/amex/short.csv'
      ),
      'utf8'
    );

    await createImportDraft('org_1', {
      accountId: summaryRow.accountId,
      fileName: 'amex-short.csv',
      content: amexShort,
      selection: { kind: 'profile', profileId: 'amex' },
    });

    expect(insertImportBatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        contentProfileId: 'amex',
        fileName: 'amex-short.csv',
        rowCount: 4,
      })
    );
    const insertedRows = vi.mocked(insertImportBatchRows).mock.calls[0][1];
    expect(insertedRows).toHaveLength(4);
    expect(insertedRows[0]).toMatchObject({
      parsedType: 'expense',
      parsedDate: '2026-05-02',
      parsedAmount: 1234,
    });
    expect(insertedRows[2]).toMatchObject({
      parsedType: 'refund',
      reviewType: 'settlement',
    });
    expect(insertedRows[0]).not.toHaveProperty('classificationHint');
  });

  it('derives row status on GET without persisting recomputation', async () => {
    const needsReviewRow = {
      ...draftRow,
      reviewCategoryId: null,
    };
    vi.mocked(listDraftRows).mockResolvedValue([needsReviewRow]);

    const draft = await getImportDraft('org_1', summaryRow.id);

    expect(draft.rows[0]?.status).toBe('needs_review');
    expect(draft.validRowCount).toBe(1);
    expect(draft.invalidRowCount).toBe(0);
    expect(draft.refundTargetFacts).toEqual({});
    expect(draft.contentProfileId).toBeNull();
    expect(listRefundTargetExpensesByIds).toHaveBeenCalledWith('org_1', [], db);
  });

  it('surfaces the content profile id when the batch was parsed with a known profile', async () => {
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      ...summaryRow,
      contentProfileId: 'amex',
    });

    const draft = await getImportDraft('org_1', summaryRow.id);

    expect(draft.contentProfileId).toBe('amex');
  });

  it('returns null contentProfileId for custom-mapped uploads', async () => {
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      ...summaryRow,
      contentProfileId: null,
    });

    const draft = await getImportDraft('org_1', summaryRow.id);

    expect(draft.contentProfileId).toBeNull();
  });

  it('fails closed when a persisted content profile id is unknown', async () => {
    vi.mocked(fetchDraftSummaryById).mockResolvedValue({
      ...summaryRow,
      contentProfileId: 'not-a-profile' as never,
    });

    await expect(getImportDraft('org_1', summaryRow.id)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Import draft has an unknown content profile.',
    });
  });

  it('derives hub draft counts from current row facts', async () => {
    vi.mocked(listActiveImportDraftSummaries).mockResolvedValue([summaryRow]);
    vi.mocked(listDraftRowsForBatches).mockResolvedValue([
      draftRow,
      {
        ...draftRow,
        id: '44444444-4444-4444-8444-444444444444',
        rowNumber: 3,
        parsedDate: null,
        parsedAmount: null,
        parsedType: null,
        parsedDescription: null,
        reviewDate: null,
        reviewAmount: null,
        reviewType: null,
        reviewDescription: null,
      },
    ]);

    const drafts = await listActiveImportDrafts('org_1');

    expect(drafts).toEqual([
      expect.objectContaining({
        id: summaryRow.id,
        rowCount: 2,
        validRowCount: 1,
        invalidRowCount: 1,
      }),
    ]);
  });

  it('rejects an unrecognized headed CSV without explicit selection', async () => {
    await expect(
      createImportDraft('org_1', {
        accountId: summaryRow.accountId,
        fileName: 'unknown.csv',
        content: 'posted,total,memo\n2026-05-02,42,Coffee',
      })
    ).rejects.toMatchObject({
      code: 'IMPORT_FILE_UNRECOGNIZED',
    });
    expect(insertImportBatch).not.toHaveBeenCalled();
  });

  it('returns mapping_required for a generic positional file without explicit selection', async () => {
    const result = await createImportDraft('org_1', {
      accountId: summaryRow.accountId,
      fileName: 'statement.csv',
      content: [
        '05/02/2026,NEIGHBORHOOD GROCERY,12.34,,100.00',
        '05/08/2026,MERCHANT CREDIT,,5.00,105.00',
      ].join('\n'),
    });

    expect(result).toMatchObject({
      kind: 'mapping_required',
      candidateProfileIds: ['mdy_debit_credit_balance'],
      columns: ['Column 1', 'Column 2', 'Column 3', 'Column 4', 'Column 5'],
    });
    expect(insertImportBatch).not.toHaveBeenCalled();
  });

  it('auto-detects a recognized profile when selection is omitted', async () => {
    await createImportDraft('org_1', {
      accountId: summaryRow.accountId,
      fileName: 'statement.csv',
      content: 'date,amount,description,type\n2026-05-02,42.18,Coffee,expense',
    });

    expect(insertImportBatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        contentProfileId: 'internal',
      })
    );
  });

  it('persists invalid row facts after confirming a generic positional profile', async () => {
    const result = await createImportDraft('org_1', {
      accountId: summaryRow.accountId,
      fileName: 'statement.csv',
      content: [
        '05/02/2026,NEIGHBORHOOD GROCERY,12.34,,100.00',
        'not-a-date,BROKEN SIGNATURE,12.34,,100.00',
      ].join('\n'),
      selection: { kind: 'profile', profileId: 'mdy_debit_credit_balance' },
    });

    expect(result.kind).toBe('draft');
    const insertedRows = vi.mocked(insertImportBatchRows).mock.calls[0][1];
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0]).toMatchObject({
      parsedDate: '2026-05-02',
    });
    expect(insertedRows[1]).toMatchObject({
      parsedDate: null,
      parsedDescription: 'BROKEN SIGNATURE',
    });
    expect(deriveImportRowStatus(insertedRows[1] as ImportRowStatusInput)).toBe(
      'invalid'
    );
  });

  it('resumes the active draft for an account without inserting a new batch', async () => {
    vi.mocked(fetchActiveDraftByAccount).mockResolvedValue(summaryRow);

    const result = await createImportDraft('org_1', {
      accountId: summaryRow.accountId,
      fileName: 'new.csv',
      content: 'date,amount,description,type\n2026-05-02,42.18,Coffee,expense',
      selection: { kind: 'profile', profileId: 'internal' },
    });

    expect(result.kind).toBe('draft');
    if (result.kind !== 'draft') return;
    expect(result.meta.reusedExisting).toBe(true);
    expect(insertImportBatch).not.toHaveBeenCalled();
    expect(insertImportBatchRows).not.toHaveBeenCalled();
    expect(listMerchantRulesWithTags).not.toHaveBeenCalled();
    expect(listAccountMemberDetails).not.toHaveBeenCalled();
  });

  it('returns the raced draft when concurrent uploads hit the unique draft index', async () => {
    vi.mocked(db.transaction).mockRejectedValueOnce({ code: '23505' });
    vi.mocked(fetchActiveDraftByAccount).mockResolvedValueOnce(null);
    vi.mocked(fetchActiveDraftByAccount).mockResolvedValueOnce(summaryRow);

    const result = await createImportDraft('org_1', {
      accountId: summaryRow.accountId,
      fileName: 'statement.csv',
      content: 'date,amount,description,type\n2026-05-02,42.18,Coffee,expense',
      selection: { kind: 'profile', profileId: 'internal' },
    });

    expect(result.kind).toBe('draft');
    if (result.kind !== 'draft') return;
    expect(result.meta.reusedExisting).toBe(true);
    expect(result.data.id).toBe(summaryRow.id);
  });

  it('returns persisted row without derived status when category is patched', async () => {
    const needsReviewRow = {
      ...draftRow,
      reviewCategoryId: null,
    };
    const updatedRow = {
      ...needsReviewRow,
      reviewCategoryId: '55555555-5555-4555-8555-555555555555',
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };

    vi.mocked(fetchDraftRowById).mockResolvedValue(needsReviewRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);

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
    expect(listDraftRows).not.toHaveBeenCalled();
    expect(listMerchantRulesWithTags).not.toHaveBeenCalled();
    expect(result.row.reviewCategoryId).toBe(
      '55555555-5555-4555-8555-555555555555'
    );
    expect(result.row).not.toHaveProperty('status');
    expect(result.row).not.toHaveProperty('invalidReason');
  });

  it('returns persisted row without re-deriving status when review fields are patched', async () => {
    const invalidRow = {
      ...draftRow,
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
    expect(listDraftRows).not.toHaveBeenCalled();
    expect(result.row.reviewDescription).toBe('Coffee');
    expect(result.row).not.toHaveProperty('status');
  });

  it('returns persisted row without derived invalidReason when a row stays structurally invalid', async () => {
    const invalidRow = {
      ...draftRow,
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
    expect(listDraftRows).not.toHaveBeenCalled();
    expect(result.row.reviewDate).toBe('2026-05-02');
    expect(result.row).not.toHaveProperty('invalidReason');
  });

  it('returns persisted row when a row loses required review fields', async () => {
    const reviewOnlyRow = {
      ...draftRow,
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
    expect(listDraftRows).not.toHaveBeenCalled();
    expect(result.row.reviewDate).toBeNull();
    expect(result.row).not.toHaveProperty('status');
  });

  it('persists row field updates without writing derived status columns', async () => {
    const updatedRow = {
      ...draftRow,
      reviewNotes: 'memo',
      updatedAt: new Date('2026-05-20T13:00:00Z'),
    };

    vi.mocked(fetchDraftRowById).mockResolvedValue(draftRow);
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue(updatedRow);

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
    expect(listDraftRows).not.toHaveBeenCalled();
    expect(result.row.reviewNotes).toBe('memo');
    expect(result.row).not.toHaveProperty('status');
  });

  it('updates row selection in batch and returns persisted rows only', async () => {
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
    expect(listDraftRows).toHaveBeenCalledWith('org_1', summaryRow.id, tx);
    expect(result).toHaveLength(1);
    expect(result[0]?.selectedForImport).toBe(true);
    expect(result[0]).not.toHaveProperty('status');
  });

  it('accepts an exact match when the row is selected', async () => {
    const matchedRow = {
      ...draftRow,
      selectedForImport: true,
    };
    vi.mocked(fetchDraftSummaryById).mockResolvedValue(summaryRow);
    vi.mocked(listDraftRowIdsForDraft).mockResolvedValue([{ id: draftRow.id }]);
    vi.mocked(updateImportDraftRowSelectionQuery).mockResolvedValue([
      matchedRow,
    ]);
    vi.mocked(listDraftRows).mockResolvedValue([matchedRow]);
    vi.mocked(listImportMatchTargets).mockResolvedValue(
      new Map([
        [
          'tx-1',
          {
            id: 'tx-1',
            accountId: summaryRow.accountId,
            type: 'expense',
            date: '2026-05-02',
            amount: 4218,
            description: 'Coffee',
            rawDescription: 'Coffee',
            externalId: 'visa-1001',
            deleted: false,
          },
        ],
      ])
    );
    vi.mocked(updateImportDraftRowQuery).mockResolvedValue({
      ...matchedRow,
      reviewMatchedTransactionId: 'tx-1',
    });
    const tx = {} as never;
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn(tx));

    const result = await updateImportDraftRowSelection('org_1', summaryRow.id, {
      rowIds: [draftRow.id],
      selectedForImport: true,
    });

    expect(updateImportDraftRowQuery).toHaveBeenCalledWith(
      'org_1',
      draftRow.id,
      { reviewMatchedTransactionId: 'tx-1' },
      tx
    );
    expect(result[0]?.reviewMatchedTransactionId).toBe('tx-1');
  });

  it('returns persisted row without sibling re-derive when refund category is patched', async () => {
    const expenseId = '77777777-7777-4777-8777-777777777777';
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

    const result = await updateImportDraftRow('org_1', refundRow.id, {
      reviewCategoryId: '55555555-5555-4555-8555-555555555555',
    });

    expect(listDraftRows).not.toHaveBeenCalled();
    expect(result.row.reviewCategoryId).toBe(
      '55555555-5555-4555-8555-555555555555'
    );
    expect(result.row).not.toHaveProperty('status');
  });

  it('returns refundTargetFacts when reviewRefundOf is patched', async () => {
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
    expect(listDraftRows).not.toHaveBeenCalled();
    expect(result.row).toMatchObject({
      reviewCounterpartAccountId: fundingId,
      reviewRefundOf: expenseId,
      externalId: settlementRow.externalId,
    });
    expect(result.row).not.toHaveProperty('status');
    expect(result.refundTargetFacts).toEqual({
      [expenseId]: {
        id: expenseId,
        accountId: summaryRow.accountId,
        amount: 5000,
        categoryId: '55555555-5555-4555-8555-555555555555',
        assigneeMemberIds: ['44444444-4444-4444-8444-444444444444'],
        type: 'expense',
        deleted: false,
      },
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
