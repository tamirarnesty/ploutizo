import { TRANSACTION_TYPE_VALUES } from '@ploutizo/types';
import type { DateRangeOperator } from '@ploutizo/types';
import type { TransactionQueryParams } from '@/lib/data-access/transactions';
import {
  dateFilterFromSearch,
  dateFilterToSearch,
} from './transactionDateFilter';

// Pagination/sort params are optional — absent means "use component default".
// validateTransactionSearch only includes present, valid fields so defaults are
// not injected into the URL (which would pollute every /transactions URL with
// ?page=1&sort=date&order=desc). buildCleanSearch in transactionFilterUrl.ts strips
// these before writing to the URL; defaults are applied in the component when
// reading search params. Page size is persisted in localStorage (see
// useTablePageSize), not the URL.

/** Shared debounce for transaction text search (list filter, refund linker). */
export const TRANSACTION_SEARCH_DEBOUNCE_MS = 300;

const TRANSACTION_SORT_FIELDS = [
  'date',
  'amount',
  'type',
  'category',
  'account',
] as const;

const TRANSACTION_SORT_ORDERS = ['asc', 'desc'] as const;

export type TransactionSortField = (typeof TRANSACTION_SORT_FIELDS)[number];
export type TransactionSortOrder = (typeof TRANSACTION_SORT_ORDERS)[number];

export const isTransactionSortField = (
  value: string
): value is TransactionSortField =>
  TRANSACTION_SORT_FIELDS.some((field) => field === value);

export const isTransactionSortOrder = (
  value: string
): value is TransactionSortOrder =>
  TRANSACTION_SORT_ORDERS.some((order) => order === value);

export type TransactionSearch = {
  page?: number;
  sort?: TransactionSortField;
  order?: TransactionSortOrder;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  categoryId?: string;
  assigneeId?: string;
  tagIds?: string; // comma-separated UUIDs per RESEARCH.md Pitfall 4
  dateRange_op?: DateRangeOperator;
  importBatchId?: string;
  importOutcome?: 'created' | 'matched';
  search?: string;
};

const TRANSACTION_SEARCH_STRING_FIELDS = [
  'search',
] as const satisfies readonly (keyof TransactionSearch)[];

export const TRANSACTION_LIST_FILTER_PARAMS = [
  'type',
  'accountId',
  'categoryId',
  'assigneeId',
  'tagIds',
] as const satisfies readonly (keyof TransactionSearch)[];

export type TransactionListFilterParam =
  (typeof TRANSACTION_LIST_FILTER_PARAMS)[number];

export const parseFilterList = (value: string | undefined): string[] => [
  ...new Set((value ?? '').split(',').filter(Boolean)),
];

export const formatFilterList = (values: string[]): string | undefined =>
  values.length > 0 ? values.join(',') : undefined;

const isTransactionTypeValue = (value: string) =>
  TRANSACTION_TYPE_VALUES.some((type) => type === value);

const parseOptionalPage = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return undefined;
  }
  return value;
};

const parseOptionalSort = (
  value: unknown
): TransactionSortField | undefined => {
  if (typeof value !== 'string') return undefined;
  return isTransactionSortField(value) ? value : undefined;
};

const parseOptionalOrder = (
  value: unknown
): TransactionSortOrder | undefined => {
  if (typeof value !== 'string') return undefined;
  return isTransactionSortOrder(value) ? value : undefined;
};

const parseOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

export const parseImportOutcome = (
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
  search: search.search || undefined,
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

  // Drop malformed hand-edited values so every consumer sees clean ones.
  for (const field of TRANSACTION_LIST_FILTER_PARAMS) {
    const values = parseFilterList(parseOptionalString(search[field]));
    const valid =
      field === 'type' ? values.filter(isTransactionTypeValue) : values;
    const formatted = formatFilterList(valid);
    if (formatted !== undefined) result[field] = formatted;
  }

  // Round-trip through the filter model to drop operators the UI cannot express.
  const dateParams = dateFilterToSearch(
    dateFilterFromSearch({
      dateFrom: parseOptionalString(search.dateFrom),
      dateTo: parseOptionalString(search.dateTo),
      dateRange_op: parseOptionalString(search.dateRange_op),
    })
  );
  delete result.dateFrom;
  delete result.dateTo;
  delete result.dateRange_op;
  if (dateParams.dateFrom) result.dateFrom = dateParams.dateFrom;
  if (dateParams.dateTo) result.dateTo = dateParams.dateTo;
  if (dateParams.dateRange_op) result.dateRange_op = dateParams.dateRange_op;

  const importBatchId = parseOptionalString(search.importBatchId);
  const importOutcome = parseImportOutcome(search.importOutcome);
  if (importBatchId && importOutcome) {
    result.importBatchId = importBatchId;
    result.importOutcome = importOutcome;
  }

  if (result.search !== undefined) {
    const trimmed = result.search.trim();
    if (trimmed) result.search = trimmed;
    else delete result.search;
  }

  return result;
};
