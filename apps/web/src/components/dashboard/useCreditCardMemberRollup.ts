import { useMemo } from 'react';
import type { SettlementAccountRow } from '@ploutizo/types';

export type MemberSettlementRollup = {
  cents: number;
  cardCount: number;
};

export type HouseholdSettlementSummary = {
  sharedRollupCents: number;
  cardTotalCents: number;
};

export const useCreditCardMemberRollup = (
  accounts: SettlementAccountRow[] | undefined
) => {
  const creditCardAccounts = useMemo(
    () =>
      (accounts ?? []).filter(
        (accountRow) => accountRow.account.type === 'credit_card'
      ),
    [accounts]
  );

  const hasHouseholdCreditCards = creditCardAccounts.length > 0;

  const memberRollup = useMemo(() => {
    const totals = new Map<string, MemberSettlementRollup>();
    for (const acc of creditCardAccounts) {
      for (const row of acc.members) {
        const prev = totals.get(row.member.id) ?? { cents: 0, cardCount: 0 };
        totals.set(row.member.id, {
          cents: prev.cents + row.personalBalanceCents,
          cardCount: prev.cardCount + (row.personalBalanceCents !== 0 ? 1 : 0),
        });
      }
    }
    return totals;
  }, [creditCardAccounts]);

  const householdSummary = useMemo((): HouseholdSettlementSummary => {
    let sharedRollupCents = 0;
    let cardTotalCents = 0;
    for (const acc of creditCardAccounts) {
      sharedRollupCents += acc.sharedBalanceCents;
      cardTotalCents += acc.totalBalanceCents;
    }
    return { sharedRollupCents, cardTotalCents };
  }, [creditCardAccounts]);

  return { hasHouseholdCreditCards, memberRollup, householdSummary };
};
