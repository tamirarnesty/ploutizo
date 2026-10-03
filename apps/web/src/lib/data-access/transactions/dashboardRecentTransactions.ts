import type { TransactionListResponse } from '@ploutizo/validators';
import {
  transactionsQueryOptions,
  useGetTransactions,
} from './useGetTransactions';
import type { TransactionQueryParams } from './useGetTransactions';
import type { UseQueryResult } from '@tanstack/react-query';

/** Dashboard strip: newest six household transactions, not scoped to the dashboard period. */
export const DASHBOARD_RECENT_TRANSACTIONS_PARAMS = {
  page: 1,
  limit: 6,
  sort: 'date',
  order: 'desc',
} satisfies TransactionQueryParams;

export const dashboardRecentTransactionsQueryOptions = transactionsQueryOptions(
  DASHBOARD_RECENT_TRANSACTIONS_PARAMS
);

export type DashboardRecentTransactionsQuery = Pick<
  UseQueryResult<TransactionListResponse>,
  'data' | 'isError' | 'isFetching' | 'isPending' | 'refetch'
>;

export const useDashboardRecentTransactions =
  (): DashboardRecentTransactionsQuery =>
    useGetTransactions(DASHBOARD_RECENT_TRANSACTIONS_PARAMS);
