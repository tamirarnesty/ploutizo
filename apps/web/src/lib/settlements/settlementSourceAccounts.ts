import type { Account } from '@ploutizo/types';

export const SETTLEMENT_SOURCE_ACCOUNT_TYPES = new Set<Account['type']>([
  'chequing',
  'savings',
  'prepaid_cash',
]);

export const isSettlementSourceAccount = (
  account: Account,
  cardAccountId: string
): boolean =>
  account.id !== cardAccountId &&
  !account.archivedAt &&
  SETTLEMENT_SOURCE_ACCOUNT_TYPES.has(account.type);

export const getSettlementSourceAccounts = (
  accounts: readonly Account[],
  cardAccountId: string
): Account[] =>
  accounts.filter((account) =>
    isSettlementSourceAccount(account, cardAccountId)
  );
