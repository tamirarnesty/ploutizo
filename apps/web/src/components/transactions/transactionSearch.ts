import { z } from 'zod'

// Pagination/sort params are optional — absent means "use component default".
// Using .optional().catch(undefined) prevents validateSearch from injecting
// default values into the URL (which would pollute every /transactions URL
// with ?page=1&limit=25&sort=date&order=desc). buildCleanSearch in
// Transactions.tsx strips these before writing to the URL; defaults are
// applied in the component when reading search params.
export const transactionSearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  limit: z.number().int().min(1).max(200).optional().catch(undefined),
  sort: z.enum(['date', 'amount', 'type', 'category', 'account']).optional().catch(undefined),
  order: z.enum(['asc', 'desc']).optional().catch(undefined),
  type: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  tagIds: z.string().optional(), // comma-separated UUIDs per RESEARCH.md Pitfall 4
})

export type TransactionSearch = z.infer<typeof transactionSearchSchema>
