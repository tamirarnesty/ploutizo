import { z } from 'zod';

// Form-level schema (dollar input). Server payload schema (createSettlementSchema)
// uses cents — convert in onSubmit.
//
// `notes` is OPTIONAL but, when present, is forwarded to the server. Plan 06
// extended `createSettlementSchema` (packages/validators/src/settlements.ts) to
// accept `notes: z.string().max(1000).optional()`, which the API persists onto
// the underlying transaction's `notes` column. Mirror the 1000-char cap here so
// the form errors before a network round-trip.
//
// `sourceAccountId` — “Paid from” in the UI; submitted as `counterpartAccountId`.
export const settleFormSchema = z.object({
  payerMemberId: z.string().uuid({ message: 'Select a member.' }),
  amountDollars: z
    .number()
    .positive('Amount must be greater than $0.')
    .max(9_999_999.99, 'Amount is too large.'),
  sourceAccountId: z.string().min(1, 'Select a source account.'),
  date: z.string().min(1, 'Date is required.'),
  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or fewer.')
    .optional(),
});

export type SettleFormValues = z.infer<typeof settleFormSchema>;
