import { queryOptions } from '@tanstack/react-query';
import type { TransactionListResponse } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
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
  description?: string;
  // Operator params — forwarded to API to control filter semantics
  type_op?: string; // 'is' | 'is_not'
  accountId_op?: string; // 'is' | 'is_not'
  categoryId_op?: string; // 'is' | 'is_not' | 'empty' | 'not_empty'
  assigneeId_op?: string; // 'is' | 'is_not' | 'empty' | 'not_empty'
  tagIds_op?: string; // 'is_any_of' | 'is_not_any_of' | 'includes_all' | 'excludes_all' | 'empty' | 'not_empty'
  dateRange_op?: string; // 'between' | 'after' | 'before'
  importLink?: { batchId: string; outcome: 'created' | 'matched' };
}

export const transactionsQueryOptions = (params: TransactionQueryParams) =>
  queryOptions({
    queryKey: ['transactions', params],
    queryFn: ({ signal }) => fetchTransactions(params, signal),
  });

export const useGetTransactions = (
  params: TransactionQueryParams
): UseQueryResult<TransactionListResponse> => {
  return useHouseholdQuery(transactionsQueryOptions(params));
};
