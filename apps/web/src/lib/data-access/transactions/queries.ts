import { apiFetch } from '@/lib/queryClient'
import type { TransactionRow, TransactionListResponse, TransactionQueryParams } from './useGetTransactions'

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
  return apiFetch<TransactionListResponse>(`/api/transactions?${qs.toString()}`)
}

export const fetchSearchTransactions = async (description: string): Promise<TransactionRow[]> => {
  const qs = new URLSearchParams()
  qs.set('description', description)
  qs.set('limit', '20')
  const r = await apiFetch<TransactionListResponse>(`/api/transactions?${qs.toString()}`)
  return r.data
}
