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
  cardAccountId: string,
  preserveAccountId?: string | null
): Account[] =>
  getAccountOptionsForTransactionSlot({
    type: 'settlement',
    slot: 'counterpartAccountId',
    accounts,
    otherSelectedAccountId: cardAccountId,
    preserveAccountId: preserveAccountId || null,
    // RFC A4: do not pass asOfDate — new settlements keep excluding archived
    // funding rather than using transaction create/edit calendar-date rules.
  }) as Account[];
