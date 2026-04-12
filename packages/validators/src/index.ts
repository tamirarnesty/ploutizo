// @ploutizo/validators — Zod schemas shared between apps/web and apps/api
import { z } from 'zod'

export const accountTypeValues = [
  'chequing',
  'savings',
  'credit_card',
  'prepaid_cash',
  'e_transfer',
  'investment',
  'other',
] as const

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required.'),
  type: z.enum(accountTypeValues, { error: 'Account type is required.' }),
  institution: z.string().optional(),
  lastFour: z.string().max(4).optional(),
  eachPersonPaysOwn: z.boolean().optional().default(false),
  memberIds: z.array(z.string().uuid()).optional().default([]),
})

export const updateAccountSchema = createAccountSchema
  .partial()
  .extend({ archivedAt: z.string().datetime().nullable().optional() })

export const updateHouseholdSettingsSchema = z.object({
  settlementThreshold: z.number().int().nonnegative().nullable(),
})

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type UpdateHouseholdSettingsInput = z.infer<typeof updateHouseholdSettingsSchema>

// --- Classification schemas ---

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required.'),
  icon: z.string().optional(),
  colour: z.string().optional(),
  sortOrder: z.number().int().optional(),
})
export const updateCategorySchema = createCategorySchema.partial()

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required.'),
  colour: z.string().optional(),
})

export const createMerchantRuleSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required.'),
  matchType: z.enum(['exact', 'contains', 'starts_with', 'ends_with', 'regex']),
  renameTo: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  priority: z.number().int().optional().default(100),
})
export const updateMerchantRuleSchema = createMerchantRuleSchema.partial()

export const reorderSchema = z.object({ orderedIds: z.array(z.string().uuid()) })

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type CreateMerchantRuleInput = z.infer<typeof createMerchantRuleSchema>
export type UpdateMerchantRuleInput = z.infer<typeof updateMerchantRuleSchema>

// --- Form schemas (client-side validation for TanStack Form) ---
// Naming: PascalCase variables and type exports (D-03a)
// Location: all form schemas live in this package (D-03c)

// AccountFormSchema — extends API schema with UI-only ownership field
export const AccountFormSchema = z.object({
  name: z.string().min(1, 'Account name is required.'),
  type: z.enum(accountTypeValues, { error: 'Account type is required.' }),
  institution: z.string().optional(),
  lastFour: z.string().max(4).optional(),
  eachPersonPaysOwn: z.boolean().default(false),
  ownership: z.enum(['personal', 'shared']),
  memberIds: z.array(z.string().uuid()).default([]),
})
export type AccountForm = z.infer<typeof AccountFormSchema>

// CategoryFormSchema — API schema minus sortOrder (not a form field)
export const CategoryFormSchema = createCategorySchema.omit({ sortOrder: true })
export type CategoryForm = z.infer<typeof CategoryFormSchema>

// RuleFormSchema — API schema minus assigneeId and priority (set server-side)
// categoryId is z.string().uuid().nullable().optional() — null means no category (D-06)
export const RuleFormSchema = createMerchantRuleSchema
  .omit({ assigneeId: true, priority: true })
  .extend({
    pattern: z.string().min(1, 'Pattern is required.'),
  })
export type RuleForm = z.infer<typeof RuleFormSchema>

// InviteMemberFormSchema — email field for household member invite
export const InviteMemberFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})
export type InviteMemberForm = z.infer<typeof InviteMemberFormSchema>

// HouseholdSettingsFormSchema — dollar string in, cents computed in onSubmit
export const HouseholdSettingsFormSchema = z.object({
  thresholdDollars: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: 'Must be a positive number.',
    })
    .optional(),
})
export type HouseholdSettingsForm = z.infer<typeof HouseholdSettingsFormSchema>

// --- Transaction schemas (D-17, D-18, D-19) ---
// All 6 transaction types as a Zod discriminated union keyed on 'type'.
// Basic value constraints only (D-18) — cross-entity rules are in the API layer (apps/api).

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
  description: z.string().optional(),
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
