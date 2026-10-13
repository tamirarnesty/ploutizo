import {
  createPinnedFilterId,
  isFilterValueActive,
} from '@ploutizo/ui/components/reui/filters-utils';
import type { Filter } from '@ploutizo/ui/components/reui/filters-types';
import type { TransactionSearch } from './transactionSearch';

const TRANSACTION_FILTER_DEFAULT_OPERATORS: Partial<Record<string, string>> = {
  type: 'is',
  accountId: 'is',
  categoryId: 'is',
  assigneeId: 'is',
  tagIds: 'is_any_of',
  dateRange: 'between',
  importOutcome: 'is',
};

/** Filters written to the URL — active values or a non-default operator still being chosen. */
export const shouldPersistTransactionFilter = (
  filter: Filter<string>
): boolean => {
  if (isFilterValueActive(filter)) {
    return true;
  }
  const defaultOperator =
    TRANSACTION_FILTER_DEFAULT_OPERATORS[filter.field] ?? 'is';
  return filter.operator !== defaultOperator;
};

/** Search params owned by the transaction filter codec (not sort/pagination). */
export const TRANSACTION_FILTER_SEARCH_KEYS = [
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
  'importBatchId',
  'importOutcome',
] as const satisfies readonly (keyof TransactionSearch)[];

// Strips URL params that match their defaults to keep the URL clean (D-04)
export const buildCleanSearch = (
  params: Partial<TransactionSearch>
): Partial<TransactionSearch> => {
  const result: Partial<TransactionSearch> = { ...params };
  if (result.page === 1) delete result.page;
  if (result.sort === 'date') delete result.sort;
  if (result.order === 'desc') delete result.order;
  if (!result.type) delete result.type;
  if (!result.dateFrom) delete result.dateFrom;
  if (!result.dateTo) delete result.dateTo;
  if (!result.accountId) delete result.accountId;
  if (!result.categoryId) delete result.categoryId;
  if (!result.assigneeId) delete result.assigneeId;
  if (!result.tagIds) delete result.tagIds;
  // Strip default-value operators so they don't pollute the URL.
  // Only non-default operators (e.g. 'is_not', 'includes_all') appear in URL params.
  if (result.type_op === 'is') delete result.type_op;
  if (result.accountId_op === 'is') delete result.accountId_op;
  if (result.categoryId_op === 'is') delete result.categoryId_op;
  if (result.assigneeId_op === 'is') delete result.assigneeId_op;
  if (result.tagIds_op === 'is_any_of') delete result.tagIds_op;
  if (result.dateRange_op === 'between') delete result.dateRange_op;
  if (!result.importBatchId) delete result.importBatchId;
  if (!result.importOutcome) delete result.importOutcome;
  return result;
};

// Maps Filter[] state back to URL search params, including operator params
export const filtersToSearch = (
  filters: Filter<string>[]
): Partial<TransactionSearch> => {
  const result: Partial<TransactionSearch> = {};
  for (const f of filters) {
    if (f.field === 'type') {
      if (f.values[0]) {
        result.type = f.values[0];
        if (f.operator && f.operator !== 'is') result.type_op = f.operator;
      } else if (f.operator && f.operator !== 'is') {
        result.type_op = f.operator;
      }
    } else if (f.field === 'dateRange') {
      const op = f.operator;
      if (op === 'after' && f.values[0]) {
        result.dateFrom = f.values[0];
        result.dateRange_op = 'after';
      } else if (op === 'after') {
        result.dateRange_op = 'after';
      } else if (op === 'before' && f.values[0]) {
        result.dateTo = f.values[0];
        result.dateRange_op = 'before';
      } else if (op === 'before') {
        result.dateRange_op = 'before';
      } else if (op === 'is' && f.values[0]) {
        // 'is X' — send as dateFrom; API uses eq on dateFrom when op=is
        result.dateFrom = f.values[0];
        result.dateRange_op = 'is';
      } else if (op === 'is') {
        result.dateRange_op = 'is';
      } else if (op === 'is_not' && f.values[0]) {
        result.dateFrom = f.values[0];
        result.dateRange_op = 'is_not';
      } else if (op === 'is_not') {
        result.dateRange_op = 'is_not';
      } else if (op === 'not_between') {
        if (f.values[0]) result.dateFrom = f.values[0];
        if (f.values[1]) result.dateTo = f.values[1];
        result.dateRange_op = 'not_between';
      } else if (f.values.length >= 1) {
        // 'between' (default)
        result.dateFrom = f.values[0];
        result.dateTo = f.values[1] ?? '';
        // dateRange_op 'between' is the default — omit from URL
      }
    } else if (f.field === 'accountId') {
      if (f.values[0]) {
        result.accountId = f.values[0];
        if (f.operator && f.operator !== 'is') result.accountId_op = f.operator;
      } else if (f.operator && f.operator !== 'is') {
        result.accountId_op = f.operator;
      }
    } else if (f.field === 'categoryId') {
      if (f.operator === 'empty' || f.operator === 'not_empty') {
        result.categoryId_op = f.operator; // no value needed for empty/not_empty
      } else if (f.values[0]) {
        result.categoryId = f.values[0];
        if (f.operator && f.operator !== 'is')
          result.categoryId_op = f.operator;
      } else if (f.operator && f.operator !== 'is') {
        result.categoryId_op = f.operator;
      }
    } else if (f.field === 'assigneeId') {
      if (f.operator === 'empty' || f.operator === 'not_empty') {
        result.assigneeId_op = f.operator; // no value needed for empty/not_empty
      } else if (f.values[0]) {
        result.assigneeId = f.values[0];
        if (f.operator && f.operator !== 'is')
          result.assigneeId_op = f.operator;
      } else if (f.operator && f.operator !== 'is') {
        result.assigneeId_op = f.operator;
      }
    } else if (f.field === 'tagIds') {
      if (f.operator === 'empty' || f.operator === 'not_empty') {
        result.tagIds_op = f.operator; // no value needed for empty/not_empty
      } else if (f.values.length > 0) {
        result.tagIds = f.values.join(',');
        if (f.operator && f.operator !== 'is_any_of')
          result.tagIds_op = f.operator;
      } else if (f.operator && f.operator !== 'is_any_of') {
        result.tagIds_op = f.operator;
      }
    } else if (
      f.field === 'importOutcome' &&
      (f.values[0] === 'created' || f.values[0] === 'matched')
    ) {
      result.importOutcome = f.values[0];
    }
  }
  return result;
};

// Maps URL search params back to Filter[] for initial filter bar state.
// IDs are stable per field (not Date.now()) so filter chips keep their React
// identity across URL-sync re-renders — prevents open popovers from unmounting.
// Operators are now restored from URL params so they survive page refresh.
export const searchToFilters = (
  search: TransactionSearch
): Filter<string>[] => {
  const filters: Filter<string>[] = [];
  if (search.type) {
    filters.push({
      id: createPinnedFilterId('type'),
      field: 'type',
      operator: search.type_op ?? 'is',
      values: [search.type],
    });
  } else if (search.type_op && search.type_op !== 'is') {
    filters.push({
      id: createPinnedFilterId('type'),
      field: 'type',
      operator: search.type_op,
      values: [],
    });
  }
  // categoryId — handle empty/not_empty (no value needed)
  if (
    search.categoryId_op === 'empty' ||
    search.categoryId_op === 'not_empty'
  ) {
    filters.push({
      id: createPinnedFilterId('categoryId'),
      field: 'categoryId',
      operator: search.categoryId_op,
      values: [],
    });
  } else if (search.categoryId) {
    filters.push({
      id: createPinnedFilterId('categoryId'),
      field: 'categoryId',
      operator: search.categoryId_op ?? 'is',
      values: [search.categoryId],
    });
  } else if (search.categoryId_op && search.categoryId_op !== 'is') {
    filters.push({
      id: createPinnedFilterId('categoryId'),
      field: 'categoryId',
      operator: search.categoryId_op,
      values: [],
    });
  }
  // assigneeId — handle empty/not_empty
  if (
    search.assigneeId_op === 'empty' ||
    search.assigneeId_op === 'not_empty'
  ) {
    filters.push({
      id: createPinnedFilterId('assigneeId'),
      field: 'assigneeId',
      operator: search.assigneeId_op,
      values: [],
    });
  } else if (search.assigneeId) {
    filters.push({
      id: createPinnedFilterId('assigneeId'),
      field: 'assigneeId',
      operator: search.assigneeId_op ?? 'is',
      values: [search.assigneeId],
    });
  } else if (search.assigneeId_op && search.assigneeId_op !== 'is') {
    filters.push({
      id: createPinnedFilterId('assigneeId'),
      field: 'assigneeId',
      operator: search.assigneeId_op,
      values: [],
    });
  }
  if (search.accountId) {
    filters.push({
      id: createPinnedFilterId('accountId'),
      field: 'accountId',
      operator: search.accountId_op ?? 'is',
      values: [search.accountId],
    });
  } else if (search.accountId_op && search.accountId_op !== 'is') {
    filters.push({
      id: createPinnedFilterId('accountId'),
      field: 'accountId',
      operator: search.accountId_op,
      values: [],
    });
  }
  // tagIds — handle empty/not_empty
  if (search.tagIds_op === 'empty' || search.tagIds_op === 'not_empty') {
    filters.push({
      id: createPinnedFilterId('tagIds'),
      field: 'tagIds',
      operator: search.tagIds_op,
      values: [],
    });
  } else if (search.tagIds) {
    filters.push({
      id: createPinnedFilterId('tagIds'),
      field: 'tagIds',
      operator: search.tagIds_op ?? 'is_any_of',
      values: search.tagIds.split(','),
    });
  } else if (search.tagIds_op && search.tagIds_op !== 'is_any_of') {
    filters.push({
      id: createPinnedFilterId('tagIds'),
      field: 'tagIds',
      operator: search.tagIds_op,
      values: [],
    });
  }
  // dateRange
  const dateOp = search.dateRange_op ?? 'between';
  if (dateOp === 'after' && search.dateFrom) {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'after',
      values: [search.dateFrom],
    });
  } else if (dateOp === 'after') {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'after',
      values: [],
    });
  } else if (dateOp === 'before' && search.dateTo) {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'before',
      values: [search.dateTo],
    });
  } else if (dateOp === 'before') {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'before',
      values: [],
    });
  } else if (dateOp === 'is' && search.dateFrom) {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'is',
      values: [search.dateFrom],
    });
  } else if (dateOp === 'is') {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'is',
      values: [],
    });
  } else if (dateOp === 'is_not' && search.dateFrom) {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'is_not',
      values: [search.dateFrom],
    });
  } else if (dateOp === 'is_not') {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'is_not',
      values: [],
    });
  } else if (dateOp === 'not_between') {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'not_between',
      values: [search.dateFrom ?? '', search.dateTo ?? ''],
    });
  } else if (search.dateFrom || search.dateTo) {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'between',
      values: [search.dateFrom ?? '', search.dateTo ?? ''],
    });
  }
  if (search.importBatchId && search.importOutcome) {
    filters.push({
      id: createPinnedFilterId('importOutcome'),
      field: 'importOutcome',
      operator: 'is',
      values: [search.importOutcome],
    });
  }
  return filters;
};

export const hasActiveFilters = (search: TransactionSearch): boolean =>
  Boolean(search.type) ||
  Boolean(search.dateFrom) ||
  Boolean(search.dateTo) ||
  Boolean(search.accountId) ||
  Boolean(search.categoryId) ||
  Boolean(search.assigneeId) ||
  Boolean(search.tagIds) ||
  // empty/not_empty operators don't require a value param
  search.categoryId_op === 'empty' ||
  search.categoryId_op === 'not_empty' ||
  search.assigneeId_op === 'empty' ||
  search.assigneeId_op === 'not_empty' ||
  search.tagIds_op === 'empty' ||
  search.tagIds_op === 'not_empty' ||
  Boolean(search.importBatchId && search.importOutcome);
