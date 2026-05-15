import type { SettlementAccountRow } from '@ploutizo/types';
import type { SettleFormValues } from '../settleFormSchema';

export const getSettleInitialValues = (
  account: SettlementAccountRow,
  firstSourceId: string,
  todayIso: string
): SettleFormValues => {
  const seedMember = account.members.find((m) => m.balanceCents > 0) ?? null;
  const fallbackMember = account.members.at(0) ?? null;
  return {
    payerMemberId: seedMember
      ? seedMember.member.id
      : fallbackMember
        ? fallbackMember.member.id
        : '',
    amountDollars: seedMember
      ? Math.abs(seedMember.balanceCents) / 100
      : fallbackMember
        ? Math.abs(fallbackMember.balanceCents) / 100
        : 0,
    sourceAccountId: firstSourceId,
    date: todayIso,
    notes: '',
  };
};
