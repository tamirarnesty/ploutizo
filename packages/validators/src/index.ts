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
