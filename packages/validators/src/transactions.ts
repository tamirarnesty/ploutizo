import { INCOME_TYPE_VALUES } from '@ploutizo/types'
import { z } from 'zod'

/** Common assignee object used in split payloads (Phase 3.2 writes these). */
export const assigneeSchema = z.object({
  memberId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  /** Display cache (D-09); required on write — server normalizes to canonical values. */
  percentage: z.number(),
})

const requiredAssigneesSchema = z
  .array(assigneeSchema)
  .min(1, 'At least one assignee is required.')

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
  assignees: requiredAssigneesSchema,
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
  incomeType: z.enum(INCOME_TYPE_VALUES),
  // incomeSource removed (D-09) — free-text context goes in notes if needed
})

const transferTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('transfer'),
  // toAccountId renamed to counterpartAccountId (D-07, D-03)
  counterpartAccountId: z.string().uuid(),
})

const settlementTransactionSchema = baseTransactionSchema.extend({
  type: z.literal('settlement'),
  // settledAccountId renamed to counterpartAccountId (D-07, D-14)
  counterpartAccountId: z.string().uuid().optional(),
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
export type TransactionAssigneeInput = z.infer<typeof assigneeSchema>

/** Service-layer PATCH: full create shape with assignees optional (amount-only updates). */
export type UpdateTransactionServiceInput = CreateTransactionInput extends infer U
  ? U extends { assignees: infer A }
    ? Omit<U, 'assignees'> & { assignees?: A }
    : U
  : never

/**
 * PATCH: `assignees: []` means replace-all with no rows (clears splits). That is valid only for
 * types where persisted transactions may have zero assignee rows. Refund/settlement always require
 * at least one assignee for card-balance reconciliation — reject empty replace for those types.
 * (Flat `updateTransactionSchema` still rejects `assignees: []` — see .min(1) on that field.)
 */
const rejectPatchEmptyAssigneesWhenRequired = (
  data: CreateTransactionInput,
  ctx: z.RefinementCtx
) => {
  if (data.assignees === undefined || data.assignees.length > 0) {
    return
  }
  if (data.type === 'refund' || data.type === 'settlement') {
    ctx.addIssue({
      code: 'custom',
      message:
        'Refund and settlement require at least one assignee; cannot clear assignee rows.',
      path: ['assignees'],
    })
  }
}

/** PATCH body: full discriminated union (D-08) plus type-aware empty-assignee guard. */
export const patchTransactionSchema = createTransactionSchema.superRefine(
  rejectPatchEmptyAssigneesWhenRequired
)

export const updateTransactionSchema = baseTransactionSchema
  .partial()
  .extend({
    // type is immutable after creation — not included in update schema
    categoryId: z.string().uuid().optional(),
    refundOf: z.string().uuid().optional(),
    incomeType: z.enum(INCOME_TYPE_VALUES).optional(),
    // counterpartAccountId replaces toAccountId + settledAccountId (D-08)
    counterpartAccountId: z.string().uuid().optional(),
    // Override partial assignees: [] would otherwise clear splits while bypassing .min(1) on create variants.
    assignees: requiredAssigneesSchema.optional(),
  })
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>

// TransactionFormSchema — for TanStack Form in Phase 3.4 (type field present as discriminated union)
export const TransactionFormSchema = createTransactionSchema
export type TransactionForm = z.infer<typeof TransactionFormSchema>
