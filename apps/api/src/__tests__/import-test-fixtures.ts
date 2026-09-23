import { vi } from 'vitest';

export const ORG = 'org_a';
export const ACCOUNT = '550e8400-e29b-41d4-a716-446655440010';
export const MEMBER = '550e8400-e29b-41d4-a716-446655440020';
export const CATEGORY = '550e8400-e29b-41d4-a716-446655440030';
export const BATCH = '550e8400-e29b-41d4-a716-446655440040';
export const FUNDING = '550e8400-e29b-41d4-a716-446655440070';
export const TXN = '550e8400-e29b-41d4-a716-446655440080';

export const mockTx = {
  insert: vi.fn(),
  execute: vi.fn(),
};

export const baseAssignees = [
  { memberId: MEMBER, amountCents: 4218, percentage: 100 },
];

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
  };
});
