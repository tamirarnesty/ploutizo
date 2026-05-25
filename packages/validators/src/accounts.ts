import { ACCOUNT_TYPE_VALUES } from '@ploutizo/types'
import { z } from 'zod'

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required.'),
  type: z.enum(ACCOUNT_TYPE_VALUES, { error: 'Account type is required.' }),
  institution: z.string().optional(),
  lastFour: z.string().max(4).optional(),
  memberIds: z.array(z.string().uuid()).optional().default([]),
})

export const updateAccountSchema = createAccountSchema
  .partial()
  .extend({ archivedAt: z.string().datetime().nullable().optional() })

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>

// AccountFormSchema — extends API schema with UI-only ownership field
export const AccountFormSchema = z.object({
  name: z.string().min(1, 'Account name is required.'),
  type: z.enum(ACCOUNT_TYPE_VALUES, { error: 'Account type is required.' }),
  institution: z.string().optional(),
  lastFour: z.string().max(4).optional(),
  ownership: z.enum(['personal', 'shared']),
  memberIds: z.array(z.string().uuid()).default([]),
})
export type AccountForm = z.infer<typeof AccountFormSchema>
