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
