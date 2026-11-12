import { dateFilterToSearch } from './transactionDateFilter';
import {
  TRANSACTION_LIST_FILTER_PARAMS,
  formatFilterList,
} from './transactionSearch';
import type { TransactionFilterConfig } from './transactionFilterConfig';
import type { TransactionSearch } from './transactionSearch';

// Strips URL params that match their defaults to keep the URL clean (D-04)
export const buildCleanSearch = (
  params: Partial<TransactionSearch>
): Partial<TransactionSearch> => {
  const result: Partial<TransactionSearch> = { ...params };
  if (result.page === 1) delete result.page;
  if (result.sort === 'date') delete result.sort;
  if (result.order === 'desc') delete result.order;
  for (const param of TRANSACTION_LIST_FILTER_PARAMS) {
    if (!result[param]) delete result[param];
  }
  if (!result.search) delete result.search;
  if (!result.dateFrom) delete result.dateFrom;
  if (!result.dateTo) delete result.dateTo;
  if (!result.dateFrom && !result.dateTo) delete result.dateRange_op;
  if (result.dateRange_op === 'between') delete result.dateRange_op;
  if (!result.importBatchId) delete result.importBatchId;
  if (!result.importOutcome) delete result.importOutcome;
  return result;
};

/** URL params that remove one filter, for merging over the current search. */
export const clearFilterPatch = (
  filter: TransactionFilterConfig
): Partial<TransactionSearch> => {
  switch (filter.kind) {
    case 'selection':
      return { [filter.param]: undefined };
    case 'date':
      return dateFilterToSearch(null);
    case 'importResult':
      // The batch only scopes the import-result filter — drop it together.
      return { importOutcome: undefined, importBatchId: undefined };
  }
};

/** URL params for a selection filter's chosen values (none clears it). */
export const selectionPatch = (
  param: (typeof TRANSACTION_LIST_FILTER_PARAMS)[number],
  values: string[]
): Partial<TransactionSearch> => ({ [param]: formatFilterList(values) });

/** Whether anything narrows the list: a filter, or the text search. */
export const hasActiveFilters = (search: TransactionSearch): boolean =>
  TRANSACTION_LIST_FILTER_PARAMS.some((param) => Boolean(search[param])) ||
  Boolean(search.dateFrom) ||
  Boolean(search.dateTo) ||
  Boolean(search.search) ||
  Boolean(search.importBatchId && search.importOutcome);
