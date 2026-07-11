import {
  getAccountOptionsForTransactionSlot,
  getTransactionTypePolicy,
} from '@ploutizo/utils/transaction-policy';
import type { Account } from '@ploutizo/types';

export const SETTLEMENT_SOURCE_ACCOUNT_TYPES = new Set(
  getTransactionTypePolicy('settlement').accountSlots.find(
    (slot) => slot.field === 'counterpartAccountId'
  )?.allowedAccountTypes ?? []
);

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
  getAccountOptionsForTransactionSlot({
    type: 'settlement',
    slot: 'counterpartAccountId',
    accounts,
    otherSelectedAccountId: cardAccountId,
  }) as Account[];
