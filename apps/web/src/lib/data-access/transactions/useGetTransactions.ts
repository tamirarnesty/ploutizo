import { queryOptions } from '@tanstack/react-query';
import type { DateRangeOperator } from '@ploutizo/types';
import type { TransactionListResponse } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { useOfflineReadableQuery } from '@/lib/offline/offline-query';
import { readTransactionView } from '@/lib/offline/offline-read-store';
import { fetchTransactions } from './queries';
import type { UseQueryResult } from '@tanstack/react-query';

export interface TransactionQueryParams {
  page: number;
  limit: number;
  sort: 'date' | 'amount' | 'type' | 'category' | 'account';
  order: 'asc' | 'desc';
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  categoryId?: string;
  assigneeId?: string;
  tagIds?: string; // comma-separated UUIDs
  search?: string;
  dateRange_op?: DateRangeOperator;
  importLink?: { batchId: string; outcome: 'created' | 'matched' };
}

export const transactionsQueryOptions = (params: TransactionQueryParams) =>
  queryOptions({
    queryKey: ['transactions', params],
    queryFn: ({ signal }) => fetchTransactions(params, signal),
  });

export const useGetTransactions = (
  params: TransactionQueryParams
): UseQueryResult<TransactionListResponse> & {
  offlineUnavailable: boolean;
} => {
  const query = useHouseholdQuery(transactionsQueryOptions(params));
  return useOfflineReadableQuery(query, () => readTransactionView(params));
};
