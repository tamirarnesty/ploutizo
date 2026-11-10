import { createPinnedFilterId } from '@ploutizo/ui/components/filters-utils';
import type { Filter } from '@ploutizo/ui/components/filters-types';
import type { TransactionSearch } from './transactionSearch';

/**
 * Declarative codec for the simple transaction filters. Each descriptor owns
 * one Filter field and its URL value param. All simple filters are positive
 * multi-select: comma-joined values, no operator params. dateRange and
 * importOutcome have bespoke semantics and are handled separately below.
 */
const TRANSACTION_SIMPLE_FILTERS = [
  { field: 'type' },
  { field: 'categoryId' },
  { field: 'assigneeId' },
  { field: 'accountId' },
  { field: 'tagIds' },
] as const satisfies readonly {
  field: keyof TransactionSearch;
}[];

type SimpleFilterDescriptor = (typeof TRANSACTION_SIMPLE_FILTERS)[number];

const encodeSimpleFilter = (
  result: Partial<TransactionSearch>,
  filter: Filter<string>,
  descriptor: SimpleFilterDescriptor
) => {
  if (filter.values.length > 0) {
    result[descriptor.field] = filter.values.join(',');
  }
};

const decodeSimpleFilter = (
  search: TransactionSearch,
  descriptor: SimpleFilterDescriptor
): Filter<string> | null => {
  const value = search[descriptor.field];
  if (!value) return null;
  return {
    id: createPinnedFilterId(descriptor.field),
    field: descriptor.field,
    operator: 'is',
    values: value.split(','),
  };
};

// Strips URL params that match their defaults to keep the URL clean (D-04)
export const buildCleanSearch = (
  params: Partial<TransactionSearch>
): Partial<TransactionSearch> => {
  const result: Partial<TransactionSearch> = { ...params };
  if (result.page === 1) delete result.page;
  if (result.sort === 'date') delete result.sort;
  if (result.order === 'desc') delete result.order;
  for (const descriptor of TRANSACTION_SIMPLE_FILTERS) {
    if (!result[descriptor.field]) delete result[descriptor.field];
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

const SIMPLE_FILTERS_BY_FIELD = new Map<string, SimpleFilterDescriptor>(
  TRANSACTION_SIMPLE_FILTERS.map((d) => [d.field, d])
);

// Maps Filter[] state back to URL search params (only dateRange carries an operator)
export const filtersToSearch = (
  filters: Filter<string>[]
): Partial<TransactionSearch> => {
  const result: Partial<TransactionSearch> = {};
  for (const f of filters) {
    const descriptor = SIMPLE_FILTERS_BY_FIELD.get(f.field);
    if (descriptor) {
      encodeSimpleFilter(result, f, descriptor);
    } else if (f.field === 'dateRange') {
      const op = f.operator;
      const [first = '', second = ''] = f.values;
      // Operators without a bound date carry no meaning — emit nothing rather
      // than a bare `dateRange_op` that decodes back as a phantom filter.
      if (op === 'after' && first) {
        result.dateFrom = first;
        result.dateRange_op = 'after';
      } else if (op === 'before' && first) {
        result.dateTo = first;
        result.dateRange_op = 'before';
      } else if ((op === 'is' || op === 'is_not') && first) {
        // 'is X' — send as dateFrom; API uses eq on dateFrom when op=is
        result.dateFrom = first;
        result.dateRange_op = op;
      } else if (op === 'not_between' && (first || second)) {
        if (first) result.dateFrom = first;
        if (second) result.dateTo = second;
        result.dateRange_op = 'not_between';
      } else if (first || second) {
        // 'between' (default)
        result.dateFrom = first || undefined;
        result.dateTo = second || undefined;
        // dateRange_op 'between' is the default — omit from URL
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
  for (const descriptor of TRANSACTION_SIMPLE_FILTERS) {
    const filter = decodeSimpleFilter(search, descriptor);
    if (filter) filters.push(filter);
  }
  // dateRange — operator determines which bound(s) the values map to. An
  // operator param without its bound date is meaningless and ignored.
  const dateOp = search.dateRange_op ?? 'between';
  if (dateOp === 'after' && search.dateFrom) {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'after',
      values: [search.dateFrom],
    });
  } else if (dateOp === 'before' && search.dateTo) {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'before',
      values: [search.dateTo],
    });
  } else if ((dateOp === 'is' || dateOp === 'is_not') && search.dateFrom) {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: dateOp,
      values: [search.dateFrom],
    });
  } else if (dateOp === 'not_between' && (search.dateFrom || search.dateTo)) {
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
  TRANSACTION_SIMPLE_FILTERS.some((descriptor) =>
    Boolean(search[descriptor.field])
  ) ||
  Boolean(search.dateFrom) ||
  Boolean(search.dateTo) ||
  Boolean(search.search) ||
  Boolean(search.importBatchId && search.importOutcome);
