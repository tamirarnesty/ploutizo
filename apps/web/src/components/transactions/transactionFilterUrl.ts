import {
  createPinnedFilterId,
  isFilterValueActive,
} from '@ploutizo/ui/components/reui/filters-utils';
import type { Filter } from '@ploutizo/ui/components/reui/filters-types';
import type { TransactionSearch } from './transactionSearch';

/**
 * Declarative codec for the simple transaction filters. Each descriptor owns
 * one Filter field, its URL value param, its `${field}_op` param, the default
 * operator, and how values map (scalar = single value; entity = single value
 * plus empty/not_empty operators; multi = comma-joined values plus
 * empty/not_empty operators). dateRange and importOutcome have bespoke
 * semantics and are handled separately below.
 */
const TRANSACTION_SIMPLE_FILTERS = [
  { field: 'type', defaultOperator: 'is', kind: 'scalar' },
  { field: 'categoryId', defaultOperator: 'is', kind: 'entity' },
  { field: 'assigneeId', defaultOperator: 'is', kind: 'entity' },
  { field: 'accountId', defaultOperator: 'is', kind: 'scalar' },
  { field: 'tagIds', defaultOperator: 'is_any_of', kind: 'multi' },
] as const satisfies readonly {
  field: keyof TransactionSearch;
  defaultOperator: string;
  kind: 'scalar' | 'entity' | 'multi';
}[];

type SimpleFilterDescriptor = (typeof TRANSACTION_SIMPLE_FILTERS)[number];

type SimpleFilterOpKey = `${SimpleFilterDescriptor['field']}_op`;

const opKeyOf = (field: SimpleFilterDescriptor['field']): SimpleFilterOpKey =>
  `${field}_op`;

const defaultOperatorFor = (field: string): string =>
  TRANSACTION_SIMPLE_FILTERS.find((d) => d.field === field)?.defaultOperator ??
  (field === 'dateRange' ? 'between' : 'is');

/** Filters written to the URL — active values or a non-default operator still being chosen. */
export const shouldPersistTransactionFilter = (
  filter: Filter<string>
): boolean => {
  if (isFilterValueActive(filter)) {
    return true;
  }
  return filter.operator !== defaultOperatorFor(filter.field);
};

const encodeSimpleFilter = (
  result: Partial<TransactionSearch>,
  filter: Filter<string>,
  descriptor: SimpleFilterDescriptor
) => {
  const opKey = opKeyOf(descriptor.field);
  const operator = filter.operator;
  // empty/not_empty carry no value — the operator param alone encodes them.
  if (
    descriptor.kind !== 'scalar' &&
    (operator === 'empty' || operator === 'not_empty')
  ) {
    result[opKey] = operator;
    return;
  }
  const hasValue =
    descriptor.kind === 'multi'
      ? filter.values.length > 0
      : Boolean(filter.values[0]);
  if (hasValue) {
    result[descriptor.field] =
      descriptor.kind === 'multi' ? filter.values.join(',') : filter.values[0];
    if (operator && operator !== descriptor.defaultOperator) {
      result[opKey] = operator;
    }
  } else if (operator && operator !== descriptor.defaultOperator) {
    result[opKey] = operator;
  }
};

const decodeSimpleFilter = (
  search: TransactionSearch,
  descriptor: SimpleFilterDescriptor
): Filter<string> | null => {
  const value = search[descriptor.field];
  const operator = search[opKeyOf(descriptor.field)];
  const makeFilter = (op: string, values: string[]): Filter<string> => ({
    id: createPinnedFilterId(descriptor.field),
    field: descriptor.field,
    operator: op,
    values,
  });
  if (
    descriptor.kind !== 'scalar' &&
    (operator === 'empty' || operator === 'not_empty')
  ) {
    return makeFilter(operator, []);
  }
  if (value) {
    return makeFilter(
      operator ?? descriptor.defaultOperator,
      descriptor.kind === 'multi' ? value.split(',') : [value]
    );
  }
  if (operator && operator !== descriptor.defaultOperator) {
    return makeFilter(operator, []);
  }
  return null;
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
    // Strip default-value operators so they don't pollute the URL.
    // Only non-default operators (e.g. 'is_not', 'includes_all') appear in URL params.
    const opKey = opKeyOf(descriptor.field);
    if (result[opKey] === descriptor.defaultOperator) delete result[opKey];
  }
  if (!result.search) delete result.search;
  if (!result.dateFrom) delete result.dateFrom;
  if (!result.dateTo) delete result.dateTo;
  if (result.dateRange_op === 'between') delete result.dateRange_op;
  if (!result.importBatchId) delete result.importBatchId;
  if (!result.importOutcome) delete result.importOutcome;
  return result;
};

const SIMPLE_FILTERS_BY_FIELD = new Map<string, SimpleFilterDescriptor>(
  TRANSACTION_SIMPLE_FILTERS.map((d) => [d.field, d])
);

// Maps Filter[] state back to URL search params, including operator params
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
  // dateRange — operator determines which bound(s) the values map to
  const dateOp = search.dateRange_op ?? 'between';
  if (dateOp === 'after') {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'after',
      values: search.dateFrom ? [search.dateFrom] : [],
    });
  } else if (dateOp === 'before') {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'before',
      values: search.dateTo ? [search.dateTo] : [],
    });
  } else if (dateOp === 'is') {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'is',
      values: search.dateFrom ? [search.dateFrom] : [],
    });
  } else if (dateOp === 'is_not') {
    filters.push({
      id: createPinnedFilterId('dateRange'),
      field: 'dateRange',
      operator: 'is_not',
      values: search.dateFrom ? [search.dateFrom] : [],
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
  TRANSACTION_SIMPLE_FILTERS.some((descriptor) => {
    if (search[descriptor.field]) return true;
    // empty/not_empty operators don't require a value param
    const operator = search[opKeyOf(descriptor.field)];
    return (
      descriptor.kind !== 'scalar' &&
      (operator === 'empty' || operator === 'not_empty')
    );
  }) ||
  Boolean(search.dateFrom) ||
  Boolean(search.dateTo) ||
  Boolean(search.search) ||
  Boolean(search.importBatchId && search.importOutcome);
