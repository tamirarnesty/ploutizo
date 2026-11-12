import {
  dataEnvelope,
  transactionListResponseSchema,
  transactionRowSchema,
} from '@ploutizo/validators';
import type {
  TransactionListResponse,
  TransactionRow,
} from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';
import type { TransactionQueryParams } from './useGetTransactions';

export const fetchTransaction = async (
  id: string,
  signal?: AbortSignal
): Promise<TransactionRow> => {
  const r = await apiFetch(
    `/api/transactions/${id}`,
    dataEnvelope(transactionRowSchema),
    { signal }
  );
  return r.data;
};

export const fetchTransactions = async (
  params: TransactionQueryParams,
  signal?: AbortSignal
): Promise<TransactionListResponse> => {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('limit', String(params.limit));
  qs.set('sort', params.sort);
  qs.set('order', params.order);
  if (params.type) qs.set('type', params.type);
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.accountId) qs.set('accountId', params.accountId);
  if (params.categoryId) qs.set('categoryId', params.categoryId);
  if (params.assigneeId) qs.set('assigneeId', params.assigneeId);
  if (params.tagIds) qs.set('tagIds', params.tagIds); // comma-separated; API splits on comma
  if (params.search) qs.set('search', params.search);
  if (params.dateRange_op) qs.set('dateRange_op', params.dateRange_op);
  if (params.importLink) {
    qs.set('importBatchId', params.importLink.batchId);
    qs.set('importOutcome', params.importLink.outcome);
  }
  return apiFetch(
    `/api/transactions?${qs.toString()}`,
    transactionListResponseSchema,
    { signal }
  );
};

export const fetchSearchTransactions = async (
  search: string,
  type?: string,
  signal?: AbortSignal
): Promise<TransactionRow[]> => {
  const qs = new URLSearchParams();
  qs.set('search', search);
  qs.set('limit', '20');
  if (type) qs.set('type', type);
  const r = await apiFetch(
    `/api/transactions?${qs.toString()}`,
    transactionListResponseSchema,
    { signal }
  );
  return r.data;
};
