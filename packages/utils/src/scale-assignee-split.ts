import { lrmSplit } from './lrm';

export type AssigneeSplitRow = {
  memberId: string;
  amountCents: number;
  percentage: number;
};

const percentageFromCents = (
  amountCents: number,
  totalCents: number
): number =>
  totalCents > 0
    ? parseFloat(((amountCents / totalCents) * 100).toFixed(3))
    : 0;

/**
 * Scales assignee cent amounts proportionally when the transaction total changes.
 * Remainder cents are distributed via largest-remainder method.
 */
export const scaleAssigneeSplitProportionally = (
  assignees: AssigneeSplitRow[],
  newTotalCents: number
): AssigneeSplitRow[] => {
  if (assignees.length === 0) return [];

  if (newTotalCents === 0) {
    return assignees.map((row) => ({
      memberId: row.memberId,
      amountCents: 0,
      percentage: 0,
    }));
  }

  const oldTotal = assignees.reduce((sum, row) => sum + row.amountCents, 0);
  if (oldTotal === 0) {
    return lrmSplit(
      newTotalCents,
      assignees.map((row) => row.memberId)
    );
  }

  const floors: number[] = [];
  const remainders: { index: number; remainder: number }[] = [];

  assignees.forEach((row, index) => {
    const ideal = (row.amountCents / oldTotal) * newTotalCents;
    const floor = Math.floor(ideal);
    floors.push(floor);
    remainders.push({ index, remainder: ideal - floor });
  });

  const allocated = floors.reduce((sum, cents) => sum + cents, 0);
  const toDistribute = newTotalCents - allocated;
  const cents = [...floors];

  remainders.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < toDistribute; i++) {
    cents[remainders[i % remainders.length].index]++;
  }

  return assignees.map((row, index) => ({
    memberId: row.memberId,
    amountCents: cents[index],
    percentage: percentageFromCents(cents[index], newTotalCents),
  }));
};
