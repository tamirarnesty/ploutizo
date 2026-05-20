import { z } from 'zod'

const incomeTypeValues = ['direct_deposit', 'e_transfer', 'cash', 'cheque', 'other'] as const

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
 * notes: optional free-text field (D-21) — replaces merchant/incomeSource free-text
 */
const baseTransactionSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().int().positive(),
  date: z.string().date(),
  description: z.string().min(1, 'Description is required.'),
  notes: z.string().optional(),
  assignees: z.array(assigneeSchema).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
})

const expenseTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('expense'),
  categoryId: z.string().uuid().optional(),
})

// Refunds participate in per-member card balances via assignee splits (see settlement query).
// Omitting assignees would record a refund that never moves any member balance — reject at validation.
const refundTransactionSchema = baseTransactionSchema.omit({ assignees: true }).extend({
  type: z.literal('refund'),
  categoryId: z.string().uuid().optional(),
  refundOf: z.string().uuid().optional(),
  assignees: z
    .array(assigneeSchema)
    .min(1, 'Refund requires at least one assignee so card balances reconcile.'),
})

const incomeTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('income'),
  incomeType: z.enum(incomeTypeValues),
  // incomeSource removed (D-09) — free-text context goes in notes if needed
})

const transferTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('transfer'),
  // toAccountId renamed to counterpartAccountId (D-07, D-03)
  counterpartAccountId: z.string().uuid(),
})

// Settlements reduce a payer's balance only through assignee rows; without them the payment is invisible to balances.
const settlementTransactionSchema = baseTransactionSchema.omit({ assignees: true }).extend({
  type: z.literal('settlement'),
  // settledAccountId renamed to counterpartAccountId (D-07, D-14)
  counterpartAccountId: z.string().uuid().optional(),
  assignees: z
    .array(assigneeSchema)
    .min(1, 'Settlement requires at least one assignee (who paid).'),
})

const contributionTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('contribution'),
  // investmentType removed (D-10) — identified via account type instead
  // counterpartAccountId: the destination investment account (e.g. FHSA, RRSP)
  counterpartAccountId: z.string().uuid().optional(),
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

/** Reject explicit `assignees: []` — same rule as updateTransactionSchema (cannot clear splits via empty array). */
const rejectEmptyAssigneesArray = (
  data: { assignees?: unknown[] },
  ctx: z.RefinementCtx
) => {
  if (data.assignees !== undefined && data.assignees.length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'When assignees are included, at least one row is required.',
      path: ['assignees'],
    })
  }
}

/** PATCH body: full discriminated union (D-08) plus empty-assignee guard. */
export const patchTransactionSchema = createTransactionSchema.superRefine(
  rejectEmptyAssigneesArray
)

export const updateTransactionSchema = baseTransactionSchema
  .partial()
  .extend({
    // type is immutable after creation — not included in update schema
    categoryId: z.string().uuid().optional(),
    refundOf: z.string().uuid().optional(),
    incomeType: z.enum(incomeTypeValues).optional(),
    // counterpartAccountId replaces toAccountId + settledAccountId (D-08)
    counterpartAccountId: z.string().uuid().optional(),
    // Override partial assignees: [] would otherwise clear splits while bypassing .min(1) on create variants.
    assignees: z
      .array(assigneeSchema)
      .min(1, 'When assignees are included, at least one row is required.')
      .optional(),
  })
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>

// TransactionFormSchema — for TanStack Form in Phase 3.4 (type field present as discriminated union)
export const TransactionFormSchema = createTransactionSchema
export type TransactionForm = z.infer<typeof TransactionFormSchema>
