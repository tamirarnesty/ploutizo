import {
  lrmSplit,
  scaleAssigneeSplitProportionally,
} from '@ploutizo/utils/assignee-split';
import { dollarsToCents } from '@ploutizo/utils/currency';
import type { AssigneeFormRow } from './types';

export const formAmountToCents = (amount: number | undefined): number =>
  amount === undefined || !Number.isFinite(amount) ? 0 : dollarsToCents(amount);

export const matchesLrmSplit = (
  assignees: AssigneeFormRow[],
  totalCents: number,
  memberIds: string[]
): boolean => {
  if (memberIds.length === 0) {
    return assignees.length === 0;
  }
  const expected = lrmSplit(totalCents, memberIds);
  return JSON.stringify(expected) === JSON.stringify(assignees);
};

/** Even split of the amount across the given members; an unset amount splits zero cents. */
export const splitAssigneesEvenly = (
  amountCents: number,
  memberIds: string[]
): AssigneeFormRow[] => lrmSplit(Math.max(amountCents, 0), memberIds);

/**
 * Carries a split over to a new transaction total. An even split stays even; a
 * customized split keeps its proportions. A zero total keeps percentages so a
 * later amount can restore the proportions.
 */
export const rescaleAssigneesForAmount = (
  current: AssigneeFormRow[],
  nextAmountCents: number
): AssigneeFormRow[] => {
  if (current.length === 0) return current;

  const next =
    nextAmountCents === 0
      ? current.map((row) => ({ ...row, amountCents: 0 }))
      : matchesLrmSplit(
            current,
            current.reduce((sum, row) => sum + row.amountCents, 0),
            current.map((row) => row.memberId)
          )
        ? lrmSplit(
            nextAmountCents,
            current.map((row) => row.memberId)
          )
        : scaleAssigneeSplitProportionally(current, nextAmountCents);

  return JSON.stringify(next) === JSON.stringify(current) ? current : next;
};
