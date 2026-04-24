import type { TransactionListResponse, TransactionQueryParams, TransactionRow } from './useGetTransactions'
import { apiFetch } from '@/lib/queryClient'

export const fetchTransaction = async (id: string): Promise<TransactionRow> => {
  const r = await apiFetch<{ data: TransactionRow }>(`/api/transactions/${id}`)
  return r.data
}

export const fetchTransactions = async (
  params: TransactionQueryParams
): Promise<TransactionListResponse> => {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('limit', String(params.limit))
  qs.set('sort', params.sort)
  qs.set('order', params.order)
  if (params.type) qs.set('type', params.type)
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params.dateTo) qs.set('dateTo', params.dateTo)
  if (params.accountId) qs.set('accountId', params.accountId)
  if (params.categoryId) qs.set('categoryId', params.categoryId)
  if (params.assigneeId) qs.set('assigneeId', params.assigneeId)
  if (params.tagIds) qs.set('tagIds', params.tagIds) // comma-separated; API splits on comma
  if (params.description) qs.set('description', params.description)
  // Operator params — only set when present (defaults are handled server-side)
  if (params.type_op) qs.set('type_op', params.type_op)
  if (params.accountId_op) qs.set('accountId_op', params.accountId_op)
  if (params.categoryId_op) qs.set('categoryId_op', params.categoryId_op)
  if (params.assigneeId_op) qs.set('assigneeId_op', params.assigneeId_op)
  if (params.tagIds_op) qs.set('tagIds_op', params.tagIds_op)
  if (params.dateRange_op) qs.set('dateRange_op', params.dateRange_op)
  return apiFetch<TransactionListResponse>(`/api/transactions?${qs.toString()}`)
}

export const fetchSearchTransactions = async (description: string, type?: string): Promise<TransactionRow[]> => {
  const qs = new URLSearchParams()
  qs.set('description', description)
  qs.set('limit', '20')
  if (type) qs.set('type', type)
  const r = await apiFetch<TransactionListResponse>(`/api/transactions?${qs.toString()}`)
  return r.data
}
