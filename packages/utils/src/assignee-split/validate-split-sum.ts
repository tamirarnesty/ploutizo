export const SPLIT_SUM_MISMATCH_MESSAGE =
  'Assignee amounts must sum to transaction amount';

export type SplitSumAssigneeRow = { amountCents: number };

export const validateSplitSum = (
  amount: number,
  assignees?: SplitSumAssigneeRow[]
): string | null => {
  if (!assignees || assignees.length === 0) return null;
  const sum = assignees.reduce((acc, a) => acc + a.amountCents, 0);
  return sum === amount ? null : SPLIT_SUM_MISMATCH_MESSAGE;
};
