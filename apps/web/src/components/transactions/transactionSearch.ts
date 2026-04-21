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
  // Operator fields — only non-default values appear in the URL (see buildCleanSearch).
  // Defaults: type/accountId/categoryId/assigneeId → 'is'; tagIds → 'is_any_of'; dateRange → 'between'
  type_op: z.string().optional(),       // 'is' | 'is_not'
  accountId_op: z.string().optional(),  // 'is' | 'is_not'
  categoryId_op: z.string().optional(), // 'is' | 'is_not' | 'empty' | 'not_empty'
  assigneeId_op: z.string().optional(), // 'is' | 'is_not' | 'empty' | 'not_empty'
  tagIds_op: z.string().optional(),     // 'is_any_of' | 'is_not_any_of' | 'includes_all' | 'excludes_all' | 'empty' | 'not_empty'
  dateRange_op: z.string().optional(),  // 'between' | 'after' | 'before'
})

export type TransactionSearch = z.infer<typeof transactionSearchSchema>
