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
