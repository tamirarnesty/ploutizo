import { getAccountOptionsForTransactionSlot } from '@ploutizo/utils/transaction-policy';
import type { Account, TransactionType } from '@ploutizo/types';
import type { TransactionAccountSlot } from '@ploutizo/utils/transaction-policy';

export interface GetTransactionFormAccountOptionsInput {
  type: TransactionType;
  slot: TransactionAccountSlot;
  accounts: readonly Account[];
  otherSelectedAccountId?: string | null;
  preserveAccountId?: string | null;
}

/**
 * Web adapter over shared transaction-policy account options.
 * Forms pass household `Account` rows; filtering, type order, archived
 * visibility, and same-account exclusion stay in the policy accessor.
 */
export const getTransactionFormAccountOptions = ({
  type,
  slot,
  accounts,
  otherSelectedAccountId,
  preserveAccountId,
}: GetTransactionFormAccountOptionsInput): Account[] =>
  getAccountOptionsForTransactionSlot({
    type,
    slot,
    accounts,
    otherSelectedAccountId: otherSelectedAccountId || null,
    preserveAccountId: preserveAccountId || null,
  }) as Account[];

/**
 * After a type switch, keep `accountId` only when it is still selectable for
 * the new type. Do not preserve archived/ineligible rows — that would hide a
 * stale UUID behind the empty state and submit an invalid write.
 */
export const resolveTransactionFormAccountIdForType = ({
  type,
  accounts,
  accountId,
}: {
  type: TransactionType;
  accounts: readonly Account[];
  accountId: string;
}): string => {
  if (!accountId) return '';

  const eligible = getTransactionFormAccountOptions({
    type,
    slot: 'accountId',
    accounts,
  });

  if (eligible.length === 0) return '';
  return eligible.some((account) => account.id === accountId) ? accountId : '';
};
