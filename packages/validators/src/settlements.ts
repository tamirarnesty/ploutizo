import { z } from 'zod'

/**
 * POST /api/settlements payload (D-03).
 *
 * The server auto-fills:
 *   - type: 'settlement'
 *   - description: generated from account name (e.g. "Settlement: Amex Gold")
 *   - assignees: single row for payerMemberId with amountCents matching the transaction amount
 *
 * @field payerMemberId - the org_member who paid (whose balance decreases)
 * @field accountId - the account being settled (whose balance decreases)
 * @field amountCents - positive integer cents (D-18: Zod rejects <= 0)
 * @field date - ISO YYYY-MM-DD
 */
export const createSettlementSchema = z.object({
  payerMemberId: z.string().uuid(),
  accountId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  date: z.string().date(),
})

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>
