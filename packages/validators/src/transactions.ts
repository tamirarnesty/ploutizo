import { INCOME_TYPE_VALUES } from '@ploutizo/types';
import { z } from 'zod';

/** Common assignee object used in split payloads (Phase 3.2 writes these). */
export const assigneeSchema = z.object({
  memberId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  /** Display cache (D-09); required on write — server normalizes to canonical values. */
  percentage: z.number(),
});

const requiredAssigneesSchema = z
  .array(assigneeSchema)
  .min(1, 'At least one assignee is required.');

/**
 * Import provenance accepted by the create transaction write path.
 * Manual UI omits these; import confirm (later) supplies them.
 * Not accepted on PATCH — provenance is immutable after create.
 */
export const importTransactionProvenanceSchema = z.object({
  importBatchId: z.string().uuid().optional(),
  /** Bank memo retained when the reviewed description differs. */
  rawDescription: z.string().min(1).nullable().optional(),
  /** Immutable bank reference — unique among active rows on the account. */
  externalId: z.string().min(1).nullable().optional(),
});

/**
 * Base fields shared by all 6 transaction types (no import provenance).
 * amount: unsigned integer cents (D-18, D-02) — must be positive, no sign encoding
 * date: ISO date string YYYY-MM-DD (D-18) — z.string().date() validates format only (not datetime)
 * notes: optional free-text field (D-21) — replaces merchant/incomeSource free-text
 */
const baseTransactionFieldsSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().int().positive(),
  date: z.string().date(),
  description: z.string().min(1, 'Description is required.'),
  notes: z.string().optional(),
  assignees: requiredAssigneesSchema,
  tagIds: z.array(z.string().uuid()).optional(),
});

const baseTransactionSchema = baseTransactionFieldsSchema.merge(
  importTransactionProvenanceSchema
);

const expenseFields = {
  type: z.literal('expense'),
  categoryId: z.string().uuid(),
} as const;

const refundFields = {
  type: z.literal('refund'),
  categoryId: z.string().uuid(),
  refundOf: z.string().uuid().optional(),
} as const;

const incomeFields = {
  type: z.literal('income'),
  incomeType: z.enum(INCOME_TYPE_VALUES),
} as const;

const transferFields = {
  type: z.literal('transfer'),
  counterpartAccountId: z.string().uuid(),
} as const;

const settlementFields = {
  type: z.literal('settlement'),
  counterpartAccountId: z.string().uuid().optional(),
  /** Bill Payment category for list readability — optional, not spend. */
  categoryId: z.string().uuid().optional(),
} as const;

const contributionFields = {
  type: z.literal('contribution'),
  counterpartAccountId: z.string().uuid().optional(),
} as const;

const expenseTransactionSchema = baseTransactionSchema.extend(expenseFields);
const refundTransactionSchema = baseTransactionSchema.extend(refundFields);
const incomeTransactionSchema = baseTransactionSchema.extend(incomeFields);
const transferTransactionSchema = baseTransactionSchema.extend(transferFields);
const settlementTransactionSchema =
  baseTransactionSchema.extend(settlementFields);
const contributionTransactionSchema =
  baseTransactionSchema.extend(contributionFields);

export const createTransactionSchema = z.discriminatedUnion('type', [
  expenseTransactionSchema,
  refundTransactionSchema,
  incomeTransactionSchema,
  transferTransactionSchema,
  settlementTransactionSchema,
  contributionTransactionSchema,
]);
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type TransactionAssigneeInput = z.infer<typeof assigneeSchema>;

type ProvenanceKey = keyof z.infer<typeof importTransactionProvenanceSchema>;

/** PATCH variants reuse the same type fields without import provenance. */
const patchExpenseTransactionSchema =
  baseTransactionFieldsSchema.extend(expenseFields);
const patchRefundTransactionSchema =
  baseTransactionFieldsSchema.extend(refundFields);
const patchIncomeTransactionSchema =
  baseTransactionFieldsSchema.extend(incomeFields);
const patchTransferTransactionSchema =
  baseTransactionFieldsSchema.extend(transferFields);
const patchSettlementTransactionSchema =
  baseTransactionFieldsSchema.extend(settlementFields);
const patchContributionTransactionSchema =
  baseTransactionFieldsSchema.extend(contributionFields);

/** Service-layer PATCH: create shape minus provenance; assignees optional. */
export type UpdateTransactionServiceInput =
  CreateTransactionInput extends infer U
    ? U extends { assignees: infer A }
      ? Omit<U, 'assignees' | ProvenanceKey> & { assignees?: A }
      : Omit<U, ProvenanceKey>
    : never;

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
    });
  }
};

/** PATCH body: full discriminated union without provenance (D-08) plus empty-assignee guard. */
export const patchTransactionSchema = z
  .discriminatedUnion('type', [
    patchExpenseTransactionSchema,
    patchRefundTransactionSchema,
    patchIncomeTransactionSchema,
    patchTransferTransactionSchema,
    patchSettlementTransactionSchema,
    patchContributionTransactionSchema,
  ])
  .superRefine(rejectEmptyAssigneesArray);

export const updateTransactionSchema = baseTransactionFieldsSchema
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
  });
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

// TransactionFormSchema — for TanStack Form in Phase 3.4 (type field present as discriminated union)
export const TransactionFormSchema = createTransactionSchema;
export type TransactionForm = z.infer<typeof TransactionFormSchema>;
