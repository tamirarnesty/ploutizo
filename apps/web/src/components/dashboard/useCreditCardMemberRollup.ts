import { useMemo } from 'react';
import type { SettlementAccountRow } from '@ploutizo/types';

export type MemberSettlementRollup = {
  cents: number;
  cardCount: number;
};

export type HouseholdSettlementSummary = {
  totalOwedCents: number;
  totalCreditCents: number;
  netOwedCents: number;
};

export const useCreditCardMemberRollup = (
  accounts: SettlementAccountRow[] | undefined
) => {
  const hasHouseholdCreditCards = useMemo(
    () =>
      (accounts ?? []).some(
        (accountRow) => accountRow.account.type === 'credit_card'
      ),
    [accounts]
  );

  const memberRollup = useMemo(() => {
    const totals = new Map<string, MemberSettlementRollup>();
    for (const acc of accounts ?? []) {
      if (acc.account.type !== 'credit_card') continue;
      for (const row of acc.members) {
        const prev = totals.get(row.member.id) ?? { cents: 0, cardCount: 0 };
        totals.set(row.member.id, {
          cents: prev.cents + row.balanceCents,
          cardCount: prev.cardCount + (row.balanceCents !== 0 ? 1 : 0),
        });
      }
    }
    return totals;
  }, [accounts]);

  const householdSummary = useMemo((): HouseholdSettlementSummary => {
    let totalOwedCents = 0;
    let totalCreditCents = 0;
    for (const rollup of memberRollup.values()) {
      if (rollup.cents > 0) totalOwedCents += rollup.cents;
      else if (rollup.cents < 0) totalCreditCents += Math.abs(rollup.cents);
    }
    return {
      totalOwedCents,
      totalCreditCents,
      netOwedCents: totalOwedCents - totalCreditCents,
    };
  }, [memberRollup]);

  return { hasHouseholdCreditCards, memberRollup, householdSummary };
};
