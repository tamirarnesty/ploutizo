import { isFilterValueActive } from '@ploutizo/ui/components/reui/filters';
import type { Filter } from '@ploutizo/ui/components/reui/filters';

/** Pinned filter field keys on `/transactions` (always visible on the filter row). */
export const TRANSACTION_PINNED_FILTER_FIELD_KEYS = [
  'type',
  'dateRange',
  'accountId',
  'categoryId',
] as const;

export type TransactionPinnedFilterFieldKey =
  (typeof TRANSACTION_PINNED_FILTER_FIELD_KEYS)[number];

export const transactionPinnedFilterId = (fieldKey: string): string =>
  `filter-${fieldKey}`;

const defaultPinnedOperator = (
  fieldKey: TransactionPinnedFilterFieldKey
): string => (fieldKey === 'dateRange' ? 'between' : 'is');

export const createEmptyPinnedTransactionFilter = (
  fieldKey: TransactionPinnedFilterFieldKey
): Filter<string> => ({
  id: transactionPinnedFilterId(fieldKey),
  field: fieldKey,
  operator: defaultPinnedOperator(fieldKey),
  values: [],
});

/** Ensures pinned controls always have a row entry; inactive empties do not affect the URL. */
export const withPinnedTransactionFilters = (
  filters: Filter<string>[]
): Filter<string>[] => {
  const unpinned = filters.filter(
    (f) =>
      !TRANSACTION_PINNED_FILTER_FIELD_KEYS.includes(
        f.field as TransactionPinnedFilterFieldKey
      )
  );
  const pinned = TRANSACTION_PINNED_FILTER_FIELD_KEYS.map((key) => {
    const existing = filters.find((f) => f.field === key);
    return existing ?? createEmptyPinnedTransactionFilter(key);
  });
  return [...pinned, ...unpinned];
};

export const resetPinnedTransactionFilter = (
  filters: Filter<string>[],
  fieldKey: TransactionPinnedFilterFieldKey
): Filter<string>[] =>
  filters.map((filter) =>
    filter.field === fieldKey
      ? createEmptyPinnedTransactionFilter(fieldKey)
      : filter
  );

export const activeTransactionFiltersForSearch = (
  filters: Filter<string>[]
): Filter<string>[] => filters.filter(isFilterValueActive);
