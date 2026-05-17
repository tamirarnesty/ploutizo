import type { SettlementAccountRow } from '@ploutizo/types';
import type { SettleFormValues } from '../settleFormSchema';

export const getSettleInitialValues = (
  account: SettlementAccountRow,
  firstSourceId: string,
  todayIso: string,
  /** When user picked a payer from UI (Action menu), wins over heuristic seed. */
  initialPayerMemberId?: string | null
): SettleFormValues => {
  const explicit =
    initialPayerMemberId != null && initialPayerMemberId.length > 0
      ? account.members.find((m) => m.member.id === initialPayerMemberId)
      : undefined;

  const seedMember =
    explicit ?? account.members.find((m) => m.balanceCents > 0) ?? null;
  const fallbackMember = account.members.at(0) ?? null;

  const chosen = seedMember ?? fallbackMember;

  return {
    payerMemberId: chosen ? chosen.member.id : '',
    amountDollars: chosen ? Math.abs(chosen.balanceCents) / 100 : 0,
    sourceAccountId: firstSourceId,
    date: todayIso,
    notes: '',
  };
};
