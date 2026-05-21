/** Auto-filled settlement transaction description (card = accountId, paidFrom = counterpartAccountId). */
export const formatSettlementDescription = (
  cardAccountName: string,
  paidFromAccountName?: string | null
): string =>
  paidFromAccountName
    ? `Settlement from ${paidFromAccountName} to ${cardAccountName}`
    : `Settlement: ${cardAccountName}`;
