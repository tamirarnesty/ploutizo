import { z } from 'zod';

// Form-level schema (dollar input). Server payload schema (createSettlementSchema)
// uses cents — convert in onSubmit.
//
// `notes` is OPTIONAL but, when present, is forwarded to the server.
// `sourceAccountId` — “Paid from” in the UI; submitted as `counterpartAccountId`.
/** Field-level amount validation — allows $0 (e.g. zero balance prefill) without inline errors. */
export const settleAmountDollarsFieldSchema = z
  .number()
  .min(0, 'Amount cannot be negative.')
  .max(9_999_999.99, 'Amount is too large.');

export const settleFormSchema = z.object({
  payToward: z.union([
    z.string().uuid({ message: 'Select a member.' }),
    z.literal('shared'),
  ]),
  amountDollars: settleAmountDollarsFieldSchema.refine((v) => v > 0, {
    message: 'Amount must be greater than $0.',
  }),
  sourceAccountId: z.string().min(1, 'Select a source account.'),
  date: z.string().min(1, 'Date is required.'),
  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or fewer.')
    .optional(),
});

export type SettleFormValues = z.infer<typeof settleFormSchema>;
export type PayToward = SettleFormValues['payToward'];
