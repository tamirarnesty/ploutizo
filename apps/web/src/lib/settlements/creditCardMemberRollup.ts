import type { SettlementAccountRow } from '@ploutizo/types';
import { selectCreditCardAccounts } from './creditCardAccounts';

export type MemberSettlementRollup = {
  cents: number;
  cardCount: number;
};

export type HouseholdSettlementSummary = {
  sharedRollupCents: number;
  cardTotalCents: number;
};

export type CreditCardMemberRollupResult = {
  hasHouseholdCreditCards: boolean;
  memberRollup: Map<string, MemberSettlementRollup>;
  householdSummary: HouseholdSettlementSummary;
};

export const computeCreditCardMemberRollup = (
  accounts: SettlementAccountRow[] | undefined
): CreditCardMemberRollupResult => {
  const creditCardAccounts = selectCreditCardAccounts(accounts);
  const hasHouseholdCreditCards = creditCardAccounts.length > 0;

  const memberRollup = new Map<string, MemberSettlementRollup>();
  for (const acc of creditCardAccounts) {
    for (const row of acc.members) {
      const prev = memberRollup.get(row.member.id) ?? {
        cents: 0,
        cardCount: 0,
      };
      memberRollup.set(row.member.id, {
        cents: prev.cents + row.personalBalanceCents,
        cardCount: prev.cardCount + (row.personalBalanceCents !== 0 ? 1 : 0),
      });
    }
  }

  let sharedRollupCents = 0;
  let cardTotalCents = 0;
  for (const acc of creditCardAccounts) {
    sharedRollupCents += acc.sharedBalanceCents;
    cardTotalCents += acc.totalBalanceCents;
  }

  return {
    hasHouseholdCreditCards,
    memberRollup,
    householdSummary: { sharedRollupCents, cardTotalCents },
  };
};
