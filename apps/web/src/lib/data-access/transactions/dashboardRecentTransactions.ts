import { transactionsQueryOptions } from './useGetTransactions';
import type { TransactionQueryParams } from './useGetTransactions';

/** Dashboard strip: newest six household transactions, not scoped to the dashboard period. */
export const DASHBOARD_RECENT_TRANSACTIONS_PARAMS = {
  page: 1,
  limit: 6,
  sort: 'date',
  order: 'desc',
} satisfies TransactionQueryParams;

export const dashboardRecentTransactionsQueryOptions = () =>
  transactionsQueryOptions(DASHBOARD_RECENT_TRANSACTIONS_PARAMS);
