import { z } from 'zod'

export const updateHouseholdSettingsSchema = z.object({
  settlementThreshold: z.number().int().nonnegative().nullable(),
})
export type UpdateHouseholdSettingsInput = z.infer<typeof updateHouseholdSettingsSchema>

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

// InviteMemberFormSchema — email field for household member invite
export const InviteMemberFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})
export type InviteMemberForm = z.infer<typeof InviteMemberFormSchema>
