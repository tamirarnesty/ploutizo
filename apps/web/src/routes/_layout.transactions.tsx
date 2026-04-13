import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Transactions } from '../components/transactions/Transactions'

const transactionSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  limit: z.number().int().min(1).max(200).catch(25),
  sort: z.enum(['date', 'amount', 'type', 'category', 'account']).catch('date'),
  order: z.enum(['asc', 'desc']).catch('desc'),
  type: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  tagIds: z.string().optional(), // comma-separated UUIDs per RESEARCH.md Pitfall 4
})

export type TransactionSearch = z.infer<typeof transactionSearchSchema>

export const Route = createFileRoute('/_layout/transactions')({
  validateSearch: (search) => transactionSearchSchema.parse(search),
  component: Transactions,
})
