import {
  createPinnedFilterId,
  getDefaultFilterOperator,
  isFilterValueActive,
} from '@ploutizo/ui/components/reui/filters';
import type { Filter } from '@ploutizo/ui/components/reui/filters';
import { buildFilterFields } from './TransactionFilterFields';

/** Pinned filter field keys on `/transactions` (always visible on the filter row). */
export const TRANSACTION_PINNED_FILTER_FIELD_KEYS = [
  'type',
  'dateRange',
  'accountId',
  'categoryId',
] as const;

export type TransactionPinnedFilterFieldKey =
  (typeof TRANSACTION_PINNED_FILTER_FIELD_KEYS)[number];

const PINNED_FIELD_KEY_SET = new Set<string>(
  TRANSACTION_PINNED_FILTER_FIELD_KEYS
);

const PINNED_FIELD_CONFIG_BY_KEY = new Map(
  buildFilterFields([], [], [], [])
    .filter((field) => field.key && PINNED_FIELD_KEY_SET.has(field.key))
    .map((field) => [field.key as TransactionPinnedFilterFieldKey, field])
);

/** Stable reference for `Filters` `pinnedFieldKeys` (avoids reallocating each render). */
export const TRANSACTION_PINNED_FILTER_FIELD_KEYS_LIST: string[] = [
  ...TRANSACTION_PINNED_FILTER_FIELD_KEYS,
];

export const createEmptyPinnedTransactionFilter = (
  fieldKey: TransactionPinnedFilterFieldKey
): Filter<string> => {
  const field = PINNED_FIELD_CONFIG_BY_KEY.get(fieldKey);
  return {
    id: createPinnedFilterId(fieldKey),
    field: fieldKey,
    operator: field ? getDefaultFilterOperator(field) : 'is',
    values: [],
  };
};

/**
 * Materializes pinned row entries in local filter state so ReUI `updateFilter`
 * can mutate them (synthetic pinned chips alone are display-only).
 * Inactive empties are omitted from the URL via `activeTransactionFiltersForSearch`.
 */
export const withPinnedTransactionFilters = (
  filters: Filter<string>[]
): Filter<string>[] => {
  const unpinned = filters.filter((f) => !PINNED_FIELD_KEY_SET.has(f.field));
  const pinned = TRANSACTION_PINNED_FILTER_FIELD_KEYS.map((key) => {
    const existing = filters.find((f) => f.field === key);
    return existing ?? createEmptyPinnedTransactionFilter(key);
  });
  return [...pinned, ...unpinned];
};

export const activeTransactionFiltersForSearch = (
  filters: Filter<string>[]
): Filter<string>[] => filters.filter(isFilterValueActive);
