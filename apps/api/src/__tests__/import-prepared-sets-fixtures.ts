import { vi } from 'vitest';
import { buildPreparedImportRowSnapshot } from '@ploutizo/utils/prepared-import-snapshot';
import type { PreparedImportRowSnapshot } from '@ploutizo/types';

export const mockTx = {
  insert: vi.fn(),
  execute: vi.fn(),
};

vi.mock('@ploutizo/db', () => ({
  db: {
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    ),
  },
}));

vi.mock('@/lib/queries/transactions', () => ({
  enrichTransactions: vi.fn(),
  fetchTransactionById: vi.fn(),
  updateTransactionScalarsQuery: vi.fn(),
  replaceAssignees: vi.fn(),
  replaceTags: vi.fn(),
  buildListQuery: vi.fn(),
  countQuery: vi.fn(),
  counterpartAccountBelongsToOrg: vi.fn().mockResolvedValue(true),
  refundOfExists: vi.fn().mockResolvedValue(true),
  softDeleteTransactionQuery: vi.fn(),
  restoreTransactionQuery: vi.fn(),
}));

vi.mock('@/lib/queries/scope', () => ({
  fetchAccountWriteReference: vi.fn(),
  allMembersInOrg: vi.fn(),
  allTagsInOrg: vi.fn(),
  allTransactionsInOrg: vi.fn(),
  categoryExistsInOrg: vi.fn(),
  transactionExistsInOrg: vi.fn(),
}));

vi.mock('@/lib/queries/imports', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error('Unexpected @/lib/queries/imports module shape.');
  }
  return {
    ...actual,
    fetchImportBatchInOrg: vi.fn(),
    fetchDraftSummaryById: vi.fn(),
    listDraftRows: vi.fn(),
    bumpImportDraftRevision: vi.fn(),
  };
});

vi.mock('@/lib/queries/import-prepared-sets', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error(
      'Unexpected @/lib/queries/import-prepared-sets module shape.'
    );
  }
  return {
    ...actual,
    insertImportPreparedSet: vi.fn(),
    insertImportPreparedOutcomes: vi.fn(),
    deleteImportPreparedSet: vi.fn(),
    lockPreparedSetRevisionForBatch: vi.fn(),
    fetchPreparedSetForBatchRevision: vi.fn(),
    listPreparedOutcomesForSet: vi.fn(),
    fetchPreparedSetById: vi.fn(),
  };
});

vi.mock('@/lib/queries/import-refund-targets', () => ({
  listRefundTargetExpensesByIds: vi.fn(),
  sumPriorRefundTotalsByTransactionTarget: vi.fn(),
}));

vi.mock('@/lib/queries/import-match-targets', () => ({
  listImportMatchTargets: vi.fn(),
  listActiveExternalIdOwners: vi.fn(() => new Map()),
}));

vi.mock('@/lib/queries/households', () => ({
  listOrgMembers: vi.fn(),
}));

export const ORG = 'org_a';
export const ACCOUNT = '550e8400-e29b-41d4-a716-446655440010';
export const FUNDING = '550e8400-e29b-41d4-a716-446655440011';
export const MEMBER = '550e8400-e29b-41d4-a716-446655440020';
export const CATEGORY = '550e8400-e29b-41d4-a716-446655440030';
export const BATCH = '550e8400-e29b-41d4-a716-446655440040';
export const ROW = '550e8400-e29b-41d4-a716-446655440050';
export const ROW_MATCHED = '550e8400-e29b-41d4-a716-446655440051';
export const ROW_SKIPPED = '550e8400-e29b-41d4-a716-446655440052';
export const ROW_INVALID = '550e8400-e29b-41d4-a716-446655440053';
export const ROW_REFUND = '550e8400-e29b-41d4-a716-446655440054';
export const TXN = '550e8400-e29b-41d4-a716-446655440070';

export const baseAssignees = [
  { memberId: MEMBER, amountCents: 4218, percentage: 100 },
];

export const draftRow = {
  id: ROW,
  batchId: BATCH,
  orgId: ORG,
  rowNumber: 1,
  rawData: {},
  externalId: 'visa-1001',
  sourceDate: '2026-05-02',
  sourceAmount: '42.18',
  sourceDescription: 'COFFEE SHOP #42',
  sourceType: 'expense',
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense' as const,
  parsedDescription: 'Coffee Shop',
  reviewDate: '2026-05-02',
  reviewAmount: 4218,
  reviewType: 'expense' as const,
  reviewDescription: 'Neighborhood Coffee',
  reviewCategoryId: CATEGORY,
  reviewAssigneeMemberIds: [MEMBER],
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: null,
  reviewRefundLinkHint: null,
  reviewMatchedTransactionId: null,
  reviewMatchDismissed: false,
  reviewNotes: 'weekly',
  reviewTagIds: [],
  selectedForImport: true,
  createdAt: new Date('2026-05-20T12:00:00Z'),
  updatedAt: new Date('2026-05-20T12:00:00Z'),
};

export const rowSnapshot = (
  row: typeof draftRow = draftRow
): PreparedImportRowSnapshot => buildPreparedImportRowSnapshot(row);
