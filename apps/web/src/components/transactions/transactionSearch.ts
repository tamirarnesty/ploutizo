import type { TransactionQueryParams } from '@/lib/data-access/transactions';

// Pagination/sort params are optional — absent means "use component default".
// validateTransactionSearch only includes present, valid fields so defaults are
// not injected into the URL (which would pollute every /transactions URL with
// ?page=1&sort=date&order=desc). buildCleanSearch in Transactions.tsx strips
// these before writing to the URL; defaults are applied in the component when
// reading search params. Page size is persisted in localStorage (see
// useTablePageSize), not the URL.

const TRANSACTION_SORT_FIELDS = [
  'date',
  'amount',
  'type',
  'category',
  'account',
] as const;

const TRANSACTION_SORT_ORDERS = ['asc', 'desc'] as const;

export type TransactionSearch = {
  page?: number;
  sort?: (typeof TRANSACTION_SORT_FIELDS)[number];
  order?: (typeof TRANSACTION_SORT_ORDERS)[number];
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  categoryId?: string;
  assigneeId?: string;
  tagIds?: string; // comma-separated UUIDs per RESEARCH.md Pitfall 4
  // Operator fields — only non-default values appear in the URL (see buildCleanSearch).
  // Defaults: type/accountId/categoryId/assigneeId → 'is'; tagIds → 'is_any_of'; dateRange → 'between'
  type_op?: string; // 'is' | 'is_not'
  accountId_op?: string; // 'is' | 'is_not'
  categoryId_op?: string; // 'is' | 'is_not' | 'empty' | 'not_empty'
  assigneeId_op?: string; // 'is' | 'is_not' | 'empty' | 'not_empty'
  tagIds_op?: string; // 'is_any_of' | 'is_not_any_of' | 'includes_all' | 'excludes_all' | 'empty' | 'not_empty'
  dateRange_op?: string; // 'between' | 'after' | 'before' | 'is' | 'is_not' | 'not_between'
  importBatchId?: string;
  importOutcome?: 'created' | 'matched';
};

const TRANSACTION_SEARCH_STRING_FIELDS = [
  'type',
  'dateFrom',
  'dateTo',
  'accountId',
  'categoryId',
  'assigneeId',
  'tagIds',
  'type_op',
  'accountId_op',
  'categoryId_op',
  'assigneeId_op',
  'tagIds_op',
  'dateRange_op',
] as const satisfies readonly (keyof TransactionSearch)[];

const parseOptionalPage = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return undefined;
  }
  return value;
};

const parseOptionalSort = (
  value: unknown
): TransactionSearch['sort'] | undefined => {
  if (typeof value !== 'string') return undefined;
  return (TRANSACTION_SORT_FIELDS as readonly string[]).includes(value)
    ? (value as TransactionSearch['sort'])
    : undefined;
};

const parseOptionalOrder = (
  value: unknown
): TransactionSearch['order'] | undefined => {
  if (typeof value !== 'string') return undefined;
  return (TRANSACTION_SORT_ORDERS as readonly string[]).includes(value)
    ? (value as TransactionSearch['order'])
    : undefined;
};

const parseOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const parseOptionalImportOutcome = (
  value: unknown
): TransactionSearch['importOutcome'] | undefined => {
  if (value === 'created' || value === 'matched') return value;
  return undefined;
};

export const buildTransactionQueryParams = (
  search: TransactionSearch,
  limit: number
): TransactionQueryParams => ({
  page: search.page ?? 1,
  limit,
  sort: search.sort ?? 'date',
  order: search.order ?? 'desc',
  type: search.type,
  dateFrom: search.dateFrom,
  dateTo: search.dateTo,
  accountId: search.accountId,
  categoryId: search.categoryId,
  assigneeId: search.assigneeId,
  tagIds: search.tagIds,
  type_op: search.type_op,
  accountId_op: search.accountId_op,
  categoryId_op: search.categoryId_op,
  assigneeId_op: search.assigneeId_op,
  tagIds_op: search.tagIds_op,
  dateRange_op: search.dateRange_op,
  importLink:
    search.importBatchId && search.importOutcome
      ? { batchId: search.importBatchId, outcome: search.importOutcome }
      : undefined,
});

export const validateTransactionSearch = (
  search: Record<string, unknown>
): TransactionSearch => {
  const result: TransactionSearch = {};

  const page = parseOptionalPage(search.page);
  if (page !== undefined) result.page = page;

  const sort = parseOptionalSort(search.sort);
  if (sort !== undefined) result.sort = sort;

  const order = parseOptionalOrder(search.order);
  if (order !== undefined) result.order = order;

  for (const field of TRANSACTION_SEARCH_STRING_FIELDS) {
    const value = parseOptionalString(search[field]);
    if (value !== undefined) result[field] = value;
  }

  const importBatchId = parseOptionalString(search.importBatchId);
  const importOutcome = parseOptionalImportOutcome(search.importOutcome);
  if (importBatchId && importOutcome) {
    result.importBatchId = importBatchId;
    result.importOutcome = importOutcome;
  }

  return result;
};
