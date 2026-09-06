import type { Account, SettlementAccountRow } from '@ploutizo/types';
import { getSettlementSourceAccounts } from './settlementSourceAccounts';

/** Member id, or `'shared'` for the card’s shared bucket. */
export type SettlePayToward = string;

export type SettleFormComposeValues = {
  payToward: SettlePayToward;
  amountDollars: number;
  sourceAccountId: string;
  date: string;
  notes: string;
};

const balanceForPayToward = (
  account: SettlementAccountRow,
  payToward: SettlePayToward
): number => {
  if (payToward === 'shared') return account.sharedBalanceCents;
  const row = account.members.find((m) => m.member.id === payToward);
  return row?.personalBalanceCents ?? 0;
};

const defaultSourceForMember = (
  accounts: readonly Account[],
  cardAccountId: string,
  memberId: string
): string => {
  const allowed = getSettlementSourceAccounts(accounts, cardAccountId);
  const soleOwned = allowed.find(
    (a) => a.owners.length === 1 && a.owners[0]?.id === memberId
  );
  if (soleOwned) return soleOwned.id;
  return allowed.at(0)?.id ?? '';
};

const defaultSourceForShared = (
  accounts: readonly Account[],
  cardAccountId: string
): string => {
  const allowed = getSettlementSourceAccounts(accounts, cardAccountId);
  const jointChequing = allowed.find(
    (a) => a.owners.length >= 2 && a.type === 'chequing'
  );
  if (jointChequing) return jointChequing.id;
  const jointAny = allowed.find((a) => a.owners.length >= 2);
  if (jointAny) return jointAny.id;
  return allowed.at(0)?.id ?? '';
};

const prefillAmountDollars = (balanceCents: number): number =>
  balanceCents > 0 ? balanceCents / 100 : 0;

/**
 * Compose settle-dialog defaults: pay-toward amount prefill and paid-from
 * account. Policy stays here so the dialog is not a branching module.
 */
export const composeSettleFormValues = (
  account: SettlementAccountRow,
  sourceAccounts: readonly Account[],
  todayIso: string,
  payToward: SettlePayToward
): SettleFormComposeValues => {
  const balanceCents = balanceForPayToward(account, payToward);
  const sourceAccountId =
    payToward === 'shared'
      ? defaultSourceForShared(sourceAccounts, account.account.id)
      : defaultSourceForMember(sourceAccounts, account.account.id, payToward);

  return {
    payToward,
    amountDollars: prefillAmountDollars(balanceCents),
    sourceAccountId,
    date: todayIso,
    notes: '',
  };
};

/** Recompute amount when the user changes Pay toward inside the dialog. */
export const composeSettleAmountForPayToward = (
  account: SettlementAccountRow,
  payToward: SettlePayToward
): number => prefillAmountDollars(balanceForPayToward(account, payToward));
