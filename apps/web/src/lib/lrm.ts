/**
 * Largest Remainder Method split.
 * Distributes totalCents across memberIds such that all amountCents values
 * sum exactly to totalCents. Remainder cents go to the first N assignees.
 *
 * percentage returned is a display value (number). Never use for balance math.
 * The stored `transactionAssignees.percentage` Drizzle column returns a string —
 * always parseFloat() before any arithmetic on stored values.
 */
export function lrmSplit(
  totalCents: number,
  memberIds: string[],
): { memberId: string; amountCents: number; percentage: number }[] {
  if (memberIds.length === 0) return []
  const base = Math.floor(totalCents / memberIds.length)
  const remainder = totalCents - base * memberIds.length
  const exactPct = 100 / memberIds.length
  return memberIds.map((memberId, i) => ({
    memberId,
    amountCents: i < remainder ? base + 1 : base,
    percentage: parseFloat(exactPct.toFixed(3)),
  }))
}
