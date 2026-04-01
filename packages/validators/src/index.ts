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
  type: z.enum(accountTypeValues, { required_error: 'Account type is required.' }),
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
