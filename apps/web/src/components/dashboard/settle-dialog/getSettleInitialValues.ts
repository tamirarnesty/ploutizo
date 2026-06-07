import type { Account, SettlementAccountRow } from '@ploutizo/types';
import { getSettlementSourceAccounts } from '@/lib/settlements';
import type { PayToward, SettleFormValues } from '../settleFormSchema';

const balanceForPayToward = (
  account: SettlementAccountRow,
  payToward: PayToward
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

export const getSettleInitialValues = (
  account: SettlementAccountRow,
  sourceAccounts: readonly Account[],
  todayIso: string,
  payToward: PayToward
): SettleFormValues => {
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

/** Recompute amount when user changes Pay toward inside the dialog. */
export const getSettleAmountForPayToward = (
  account: SettlementAccountRow,
  payToward: PayToward
): number => prefillAmountDollars(balanceForPayToward(account, payToward));
