import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { apiFetch } from '@/lib/queryClient'

export interface TransactionAssignee {
  transactionId: string
  memberId: string
  amountCents: number
  percentage: string | null
  memberName: string | null
}

export interface TransactionTag {
  transactionId: string
  id: string
  name: string
  colour: string | null
}

export interface TransactionRow {
  id: string
  orgId: string
  type: 'expense' | 'income' | 'transfer' | 'settlement' | 'refund' | 'contribution'
  amount: number
  date: string
  description: string | null
  merchant: string | null
  categoryId: string | null
  categoryName: string | null
  categoryIcon: string | null
  accountId: string
  accountName: string | null
  accountType: string | null
  refundOf: string | null
  incomeType: string | null
  incomeSource: string | null
  toAccountId: string | null
  settledAccountId: string | null
  investmentType: string | null
  importBatchId: string | null
  recurringTemplateId: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  assignees: Array<TransactionAssignee>
  tags: Array<TransactionTag>
}

export interface TransactionQueryParams {
  page: number
  limit: number
  sort: 'date' | 'amount' | 'type' | 'category' | 'account'
  order: 'asc' | 'desc'
  type?: string
  dateFrom?: string
  dateTo?: string
  accountId?: string
  categoryId?: string
  assigneeId?: string
  tagIds?: string // comma-separated UUIDs
}

export interface TransactionListResponse {
  data: Array<TransactionRow>
  total: number
  page: number
  limit: number
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
  return apiFetch<TransactionListResponse>(`/api/transactions?${qs.toString()}`)
}

export const useGetTransactions = (
  params: TransactionQueryParams
): UseQueryResult<TransactionListResponse> => {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => fetchTransactions(params),
  })
}
