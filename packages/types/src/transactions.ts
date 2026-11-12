export type TransactionSortField =
  'date' | 'amount' | 'type' | 'category' | 'account';

export type SortOrder = 'asc' | 'desc';

/**
 * Pseudo-values the transaction list filters accept next to real ids. Real
 * ids are UUIDs, so these can never collide with one.
 * - `none`: category filter → uncategorized; tag filter → untagged.
 * - `personal` / `shared`: assignee filter → exactly one / two or more assignees.
 */
export const TRANSACTION_FILTER_SENTINELS = {
  none: 'none',
  personal: 'personal',
  shared: 'shared',
} as const;

/** Inclusion operators for the transaction list date filter. Absent means `between`. */
export const DATE_RANGE_OPERATORS = [
  'is',
  'is_not',
  'before',
  'after',
  'between',
  'not_between',
] as const;

export type DateRangeOperator = (typeof DATE_RANGE_OPERATORS)[number];

export const isDateRangeOperator = (
  value: string
): value is DateRangeOperator =>
  DATE_RANGE_OPERATORS.some((operator) => operator === value);
