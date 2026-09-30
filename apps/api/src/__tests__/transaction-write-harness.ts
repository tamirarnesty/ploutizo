import { vi } from 'vitest';
import {
  transactionAssignees,
  transactionTags,
  transactions,
} from '@ploutizo/db/schema';
import type { AccountType } from '@ploutizo/types';
import type { AccountWriteReference } from '@/lib/queries/scope';
import { fetchImportBatchInOrg } from '@/lib/queries/imports';
import {
  allMembersInOrg,
  allTagsInOrg,
  categoryExistsInOrg,
  fetchAccountWriteReference,
  listCategoryIdsInOrg,
  listMemberIdsInOrg,
  listTagIdsInOrg,
  listTransactionIdsInOrg,
  lockAccountWriteReferences,
  transactionExistsInOrg,
} from '@/lib/queries/scope';

export const ORG = 'org_a';
export const ACCOUNT = '550e8400-e29b-41d4-a716-446655440010';
export const FUNDING = '550e8400-e29b-41d4-a716-446655440011';
export const MEMBER = '550e8400-e29b-41d4-a716-446655440020';
export const CATEGORY = '550e8400-e29b-41d4-a716-446655440030';
export const TAG = '550e8400-e29b-41d4-a716-446655440035';
export const BATCH = '550e8400-e29b-41d4-a716-446655440040';
export const TXN = '550e8400-e29b-41d4-a716-446655440080';

type InsertTable =
  | 'transactions'
  | 'transaction_assignees'
  | 'transaction_tags'
  | 'other';

type InsertCall = { table: InsertTable; rows: Record<string, unknown>[] };

const tableName = (table: unknown): InsertTable =>
  table === transactions
    ? 'transactions'
    : table === transactionAssignees
      ? 'transaction_assignees'
      : table === transactionTags
        ? 'transaction_tags'
        : 'other';

export const insertCalls: InsertCall[] = [];
const insertErrors = new Map<InsertTable, unknown>();

export const failInsert = (table: InsertTable, error: unknown) => {
  insertErrors.set(table, error);
};

export const insertedRows = (table: InsertTable) =>
  insertCalls.filter((call) => call.table === table).flatMap((c) => c.rows);

/**
 * Records every INSERT. RETURNING echoes the inserted rows in reverse so
 * callers that rely on VALUES order fail.
 */
export const mockTx = {
  insert: vi.fn((table: unknown) => ({
    values: (rows: Record<string, unknown>[]) => {
      const name = tableName(table);
      insertCalls.push({ table: name, rows });
      const result = () => {
        const error = insertErrors.get(name);
        return error === undefined
          ? Promise.resolve([...rows].reverse())
          : Promise.reject(error);
      };
      return {
        then: (
          onFulfilled?: (value: undefined) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) =>
          result()
            .then(() => undefined)
            .then(onFulfilled, onRejected),
        returning: result,
      };
    },
  })),
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
  transactionExistsInOrg: vi.fn(),
  allMembersInOrg: vi.fn(),
  allTagsInOrg: vi.fn(),
  categoryExistsInOrg: vi.fn(),
  lockAccountWriteReferences: vi.fn(),
  listCategoryIdsInOrg: vi.fn(),
  listMemberIdsInOrg: vi.fn(),
  listTagIdsInOrg: vi.fn(),
  listTransactionIdsInOrg: vi.fn(),
}));

vi.mock('@/lib/queries/imports', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error('Unexpected @/lib/queries/imports module shape.');
  }
  return { ...actual, fetchImportBatchInOrg: vi.fn() };
});

export const accountRef = (
  id: string,
  type: AccountType,
  archivedAt: Date | null = null
): AccountWriteReference => ({ id, type, archivedAt });

export type OrgState = {
  accounts?: AccountWriteReference[];
  categoryIds?: string[];
  tagIds?: string[];
  memberIds?: string[];
  transactionIds?: string[];
  importBatchIds?: string[];
};

/** Wire the mocked org-scoped queries to one in-memory org. */
export const seedOrg = (state: OrgState) => {
  const accounts = new Map(
    (state.accounts ?? []).map((account) => [account.id, account])
  );
  const inOrg =
    (ids: string[] = []) =>
    (_orgId: string, requested: readonly string[]) =>
      Promise.resolve(new Set(requested.filter((id) => ids.includes(id))));
  const allInOrg =
    (ids: string[] = []) =>
    (_orgId: string, requested: string[]) =>
      Promise.resolve(requested.every((id) => ids.includes(id)));

  vi.mocked(lockAccountWriteReferences).mockImplementation((_tx, _orgId, ids) =>
    Promise.resolve(
      ids.flatMap((id) => {
        const account = accounts.get(id);
        return account ? [account] : [];
      })
    )
  );
  vi.mocked(listCategoryIdsInOrg).mockImplementation(inOrg(state.categoryIds));
  vi.mocked(listTagIdsInOrg).mockImplementation(inOrg(state.tagIds));
  vi.mocked(listMemberIdsInOrg).mockImplementation(inOrg(state.memberIds));
  vi.mocked(listTransactionIdsInOrg).mockImplementation(
    inOrg(state.transactionIds)
  );
  vi.mocked(fetchImportBatchInOrg).mockImplementation((_orgId, id) =>
    Promise.resolve(state.importBatchIds?.includes(id) ? { id } : null)
  );

  vi.mocked(fetchAccountWriteReference).mockImplementation((_orgId, id) =>
    Promise.resolve(accounts.get(id) ?? null)
  );
  vi.mocked(transactionExistsInOrg).mockImplementation((_orgId, id) =>
    Promise.resolve(Boolean(state.transactionIds?.includes(id)))
  );
  vi.mocked(categoryExistsInOrg).mockImplementation((_orgId, id) =>
    Promise.resolve(Boolean(state.categoryIds?.includes(id)))
  );
  vi.mocked(allTagsInOrg).mockImplementation(allInOrg(state.tagIds));
  vi.mocked(allMembersInOrg).mockImplementation(allInOrg(state.memberIds));
};

export const resetTransactionWriteHarness = () => {
  vi.clearAllMocks();
  insertCalls.length = 0;
  insertErrors.clear();
};

const queriedWithIds = (
  calls: readonly (readonly unknown[])[],
  idArgIndex: number
) =>
  calls.filter((call) => (call[idArgIndex] as readonly string[]).length > 0)
    .length;

/** Database round trips issued so far; empty id lists never reach the database. */
export const roundTrips = () => ({
  accountLocks: queriedWithIds(
    vi.mocked(lockAccountWriteReferences).mock.calls,
    2
  ),
  categories: queriedWithIds(vi.mocked(listCategoryIdsInOrg).mock.calls, 1),
  tags: queriedWithIds(vi.mocked(listTagIdsInOrg).mock.calls, 1),
  members: queriedWithIds(vi.mocked(listMemberIdsInOrg).mock.calls, 1),
  refundTargets: queriedWithIds(
    vi.mocked(listTransactionIdsInOrg).mock.calls,
    1
  ),
  importBatches: vi.mocked(fetchImportBatchInOrg).mock.calls.length,
  inserts: insertCalls.map((call) => call.table),
});
