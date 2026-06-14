import { z } from 'zod';

export const updateHouseholdSettingsSchema = z.object({
  settlementThreshold: z.number().int().nonnegative().nullable(),
});
export type UpdateHouseholdSettingsInput = z.infer<
  typeof updateHouseholdSettingsSchema
>;

const settlementThresholdModes = ['app_default', 'immediate', 'custom'] as const;

export const HouseholdSettlementThresholdModeSchema = z.enum(
  settlementThresholdModes
);

const isPositiveSettlementThresholdDollars = (
  thresholdDollars: number
): boolean =>
  Number.isFinite(thresholdDollars) &&
  Math.sign(thresholdDollars) * Math.round(Math.abs(thresholdDollars) * 100) > 0;

const positiveCustomThresholdDollarsSchema = z
  .number({ error: 'Enter an amount of at least $0.01.' })
  .refine(isPositiveSettlementThresholdDollars, {
    message: 'Enter an amount of at least $0.01.',
  });

// HouseholdSettingsFormSchema — explicit mode in form state, cents computed in onSubmit.
export const HouseholdSettingsFormSchema = z.discriminatedUnion(
  'thresholdMode',
  [
    z.object({
      thresholdMode: z.literal('app_default'),
      thresholdDollars: z.number().optional(),
    }),
    z.object({
      thresholdMode: z.literal('immediate'),
      thresholdDollars: z.number().optional(),
    }),
    z.object({
      thresholdMode: z.literal('custom'),
      thresholdDollars: positiveCustomThresholdDollarsSchema,
    }),
  ]
);
export type HouseholdSettingsForm = z.infer<typeof HouseholdSettingsFormSchema>;

// InviteMemberFormSchema — email field for household member invite
export const InviteMemberFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});
export type InviteMemberForm = z.infer<typeof InviteMemberFormSchema>;
