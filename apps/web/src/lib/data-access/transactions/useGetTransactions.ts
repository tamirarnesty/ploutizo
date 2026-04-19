import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { fetchTransactions } from './queries'

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
  assignees: TransactionAssignee[]
  tags: TransactionTag[]
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
  description?: string
}

export interface TransactionListResponse {
  data: TransactionRow[]
  total: number
  page: number
  limit: number
}

export const useGetTransactions = (
  params: TransactionQueryParams
): UseQueryResult<TransactionListResponse> => {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => fetchTransactions(params),
  })
}
