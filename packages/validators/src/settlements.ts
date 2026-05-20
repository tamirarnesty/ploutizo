import { z } from 'zod'

/**
 * POST /api/settlements payload (D-03 from Phase 4.1, extended in Phase 4.2 to include notes).
 *
 * The server auto-fills:
 *   - type: 'settlement'
 *   - description: generated from account name (e.g. "Settlement: Amex Gold")
 *   - assignees: single row for payerMemberId with amountCents matching the transaction amount
 *
 * @field payerMemberId - the org_member who paid (whose balance decreases)
 * @field accountId - the credit card account being settled (destination)
 * @field counterpartAccountId - bank/cash account funding the payment (source)
 * @field amountCents - positive integer cents (D-18: Zod rejects <= 0)
 * @field date - ISO YYYY-MM-DD
 * @field notes - optional free-text note, max 1000 chars (Phase 4.2 extension).
 */
export const createSettlementSchema = z.object({
  payerMemberId: z.string().uuid(),
  accountId: z.string().uuid(),
  counterpartAccountId: z.string().uuid(),
  amountCents: z.number().int().positive().max(999_999_999), // max $9,999,999.99
  date: z.string().date(),
  notes: z.string().max(1000).optional(),
})

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>
