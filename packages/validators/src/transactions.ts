import { z } from 'zod'

const incomeTypeValues = ['direct_deposit', 'e_transfer', 'cash', 'cheque', 'other'] as const
const investmentTypeValues = ['tfsa', 'rrsp', 'fhsa', 'resp', 'non_registered', 'other'] as const

/** Common assignee object used in split payloads (Phase 3.2 writes these). */
const assigneeSchema = z.object({
  memberId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  percentage: z.number().optional(),
})

/**
 * Base fields shared by all 6 transaction types.
 * amount: unsigned integer cents (D-18, D-02) — must be positive, no sign encoding
 * date: ISO date string YYYY-MM-DD (D-18) — z.string().date() validates format only (not datetime)
 */
const baseTransactionSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().int().positive(),
  date: z.string().date(),
  description: z.string().min(1, 'Description is required.'),
  merchant: z.string().optional(),
  assignees: z.array(assigneeSchema).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
})

const expenseTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('expense'),
  categoryId: z.string().uuid().optional(),
})

const refundTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('refund'),
  categoryId: z.string().uuid().optional(),
  refundOf: z.string().uuid().optional(),
})

const incomeTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('income'),
  incomeType: z.enum(incomeTypeValues),
  incomeSource: z.string().optional(),
})

const transferTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('transfer'),
  toAccountId: z.string().uuid(),
})

const settlementTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('settlement'),
  settledAccountId: z.string().uuid().optional(),
})

const contributionTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('contribution'),
  investmentType: z.enum(investmentTypeValues).optional(),
})

export const createTransactionSchema = z.discriminatedUnion('type', [
  expenseTransactionSchema,
  refundTransactionSchema,
  incomeTransactionSchema,
  transferTransactionSchema,
  settlementTransactionSchema,
  contributionTransactionSchema,
])
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>

export const updateTransactionSchema = baseTransactionSchema
  .partial()
  .extend({
    // type is immutable after creation — not included in update schema
    categoryId: z.string().uuid().optional(),
    refundOf: z.string().uuid().optional(),
    incomeType: z.enum(incomeTypeValues).optional(),
    incomeSource: z.string().optional(),
    toAccountId: z.string().uuid().optional(),
    settledAccountId: z.string().uuid().optional(),
    investmentType: z.enum(investmentTypeValues).optional(),
  })
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>

// TransactionFormSchema — for TanStack Form in Phase 3.4 (type field present as discriminated union)
export const TransactionFormSchema = createTransactionSchema
export type TransactionForm = z.infer<typeof TransactionFormSchema>
