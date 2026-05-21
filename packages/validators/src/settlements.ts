import { z } from 'zod'

const settlementAssigneeSchema = z.object({
  memberId: z.string().uuid(),
})

/**
 * POST /api/settlements payload (D-03 from Phase 4.1, extended in Phase 4.2 to include notes).
 *
 * The server auto-fills:
 *   - type: 'settlement'
 *   - description: generated via formatSettlementDescription (paid-from + card names)
 *   - assignees: one row per listed member; LRM split when length >= 2
 *
 * @field assignees - household members whose balance bucket is reduced (1 = personal, 2+ = shared)
 * @field accountId - the credit card account being settled (destination)
 * @field counterpartAccountId - bank/cash account funding the payment (source)
 * @field amountCents - positive integer cents (D-18: Zod rejects <= 0)
 * @field date - ISO YYYY-MM-DD
 * @field notes - optional free-text note, max 1000 chars (Phase 4.2 extension).
 */
export const createSettlementSchema = z
  .object({
    assignees: z.array(settlementAssigneeSchema).min(1),
    accountId: z.string().uuid(),
    counterpartAccountId: z.string().uuid(),
    amountCents: z.number().int().positive().max(999_999_999), // max $9,999,999.99
    date: z.string().date(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>()
    for (const [index, assignee] of data.assignees.entries()) {
      if (seen.has(assignee.memberId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Duplicate memberId in assignees',
          path: ['assignees', index, 'memberId'],
        })
      }
      seen.add(assignee.memberId)
    }
  })

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>
