import { computeImportDraftRowCounts } from '@ploutizo/utils/import-row-status';
import type { ImportDraft, ImportDraftRow } from '@ploutizo/types';

export const DRAFT_ID = 'draft_1';

export const makeImportDraftRow = (
  overrides: Partial<ImportDraftRow> = {}
): ImportDraftRow => ({
  id: 'row_1',
  batchId: DRAFT_ID,
  rowNumber: 2,
  status: 'ready',
  invalidReason: null,
  rawData: { date: '2026-05-02', description: 'Coffee' },
  externalId: 'visa-1001',
  sourceDate: '2026-05-02',
  sourceAmount: '42.18',
  sourceDescription: 'Coffee',
  sourceType: 'expense',
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense',
  parsedDescription: 'Coffee',
  reviewDate: '2026-05-02',
  reviewAmount: 4218,
  reviewType: 'expense',
  reviewDescription: 'Coffee',
  reviewCategoryId: 'cat_1',
  reviewAssigneeMemberIds: ['member_1'],
  reviewRefundLinkHint: null,
  reviewNotes: null,
  reviewTagIds: [],
  selectedForImport: false,
  createdAt: '2026-05-20T12:00:00.000Z',
  updatedAt: '2026-05-20T12:00:00.000Z',
  ...overrides,
});

export const makeImportDraft = (
  overrides: Partial<ImportDraft> = {}
): ImportDraft => {
  const rows = overrides.rows ?? [
    makeImportDraftRow({
      id: 'row_ready',
      status: 'ready',
      reviewDescription: 'Coffee',
      selectedForImport: false,
    }),
    makeImportDraftRow({
      id: 'row_needs_review',
      rowNumber: 3,
      status: 'needs_review',
      reviewDescription: 'Groceries',
      reviewCategoryId: null,
      selectedForImport: false,
    }),
    makeImportDraftRow({
      id: 'row_invalid',
      rowNumber: 4,
      status: 'invalid',
      reviewDescription: 'Bad charge',
      invalidReason: 'Amount must be a positive number.',
      selectedForImport: false,
    }),
  ];

  const counts = computeImportDraftRowCounts(rows);

  return {
    id: DRAFT_ID,
    accountId: 'acct_1',
    accountName: 'Visa',
    accountInstitution: 'TD',
    accountLastFour: '1234',
    source: 'ploutizo_normalized',
    status: 'draft',
    fileName: 'statement.csv',
    ...counts,
    importedAt: '2026-05-20T12:00:00.000Z',
    completedAt: null,
    discardedAt: null,
    createdAt: '2026-05-20T12:00:00.000Z',
    updatedAt: '2026-05-20T12:00:00.000Z',
    ...overrides,
    rows,
  };
};
