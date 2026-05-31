import type { Account, SettlementAccountRow } from '@ploutizo/types';
import type { PayTowardTarget } from '@/components/dashboard/card-balances/types';
import type { SettleFormValues } from '../settleFormSchema';

const ALLOWED_SOURCE_TYPES = new Set<Account['type']>([
  'chequing',
  'savings',
  'prepaid_cash',
]);

const isAllowedSource = (account: Account, cardAccountId: string) =>
  account.id !== cardAccountId &&
  !account.archivedAt &&
  ALLOWED_SOURCE_TYPES.has(account.type);

const balanceForTarget = (
  account: SettlementAccountRow,
  target: PayTowardTarget
): number => {
  if (target.kind === 'shared') return account.sharedBalanceCents;
  const row = account.members.find((m) => m.member.id === target.memberId);
  return row?.personalBalanceCents ?? 0;
};

const defaultSourceForMember = (
  accounts: readonly Account[],
  cardAccountId: string,
  memberId: string
): string => {
  const allowed = accounts.filter((a) => isAllowedSource(a, cardAccountId));
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
  const allowed = accounts.filter((a) => isAllowedSource(a, cardAccountId));
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
  payTowardTarget: PayTowardTarget
): SettleFormValues => {
  const balanceCents = balanceForTarget(account, payTowardTarget);
  const payToward =
    payTowardTarget.kind === 'shared'
      ? ('shared' as const)
      : payTowardTarget.memberId;

  const sourceAccountId =
    payTowardTarget.kind === 'shared'
      ? defaultSourceForShared(sourceAccounts, account.account.id)
      : defaultSourceForMember(
          sourceAccounts,
          account.account.id,
          payTowardTarget.memberId
        );

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
  payToward: SettleFormValues['payToward']
): number => {
  const target: PayTowardTarget =
    payToward === 'shared'
      ? { kind: 'shared' }
      : { kind: 'member', memberId: payToward };
  return prefillAmountDollars(balanceForTarget(account, target));
};
