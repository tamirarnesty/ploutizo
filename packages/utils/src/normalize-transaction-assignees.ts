import { lrmSplit } from './lrm';

export type TransactionAssigneeWriteInput = {
  memberId: string;
  amountCents: number;
  percentage: number;
};

export type NormalizedTransactionAssignee = {
  memberId: string;
  amountCents: number;
  percentage: number;
};

/**
 * Canonical assignee rows for persistence. `amountCents` is authoritative for balances;
 * `percentage` is a display cache (D-09) always populated on write.
 *
 * - 1 assignee → full transaction amount, 100%
 * - 2+ with LRM cents → use lrmSplit (even split + display percentages)
 * - 2+ with custom cents (sum === amount) → keep cents, derive percentages from amounts
 */
export const normalizeTransactionAssignees = (
  amountCents: number,
  assignees: TransactionAssigneeWriteInput[]
): NormalizedTransactionAssignee[] => {
  if (assignees.length === 0) {
    throw new Error('At least one assignee is required');
  }

  if (assignees.length === 1) {
    return [
      {
        memberId: assignees[0].memberId,
        amountCents: amountCents,
        percentage: 100,
      },
    ];
  }

  const memberIds = assignees.map((a) => a.memberId);
  const lrm = lrmSplit(amountCents, memberIds);
  const matchesLrm = assignees.every(
    (a, i) => a.amountCents === lrm[i]?.amountCents
  );

  if (matchesLrm) {
    return lrm;
  }

  return assignees.map((a) => ({
    memberId: a.memberId,
    amountCents: a.amountCents,
    percentage: parseFloat(((a.amountCents / amountCents) * 100).toFixed(3)),
  }));
};
