import { getAccountOptionsForTransactionSlot } from '@ploutizo/utils/transaction-policy';
import type { Account, TransactionType } from '@ploutizo/types';
import type { TransactionAccountSlot } from '@ploutizo/utils/transaction-policy';

export interface GetTransactionFormAccountOptionsInput {
  type: TransactionType;
  slot: TransactionAccountSlot;
  accounts: readonly Account[];
  otherSelectedAccountId?: string | null;
  preserveAccountId?: string | null;
  asOfDate?: string | null;
}

/**
 * Web adapter over shared transaction-policy account options.
 * Forms pass household `Account` rows; filtering, type order, and archived
 * visibility stay in the policy accessor. Same-account exclusion is applied
 * for both slots so two-account types cannot pick the same account twice.
 */
export const getTransactionFormAccountOptions = ({
  type,
  slot,
  accounts,
  otherSelectedAccountId,
  preserveAccountId,
  asOfDate,
}: GetTransactionFormAccountOptionsInput): Account[] => {
  const options = getAccountOptionsForTransactionSlot({
    type,
    slot,
    accounts,
    otherSelectedAccountId: otherSelectedAccountId || null,
    preserveAccountId: preserveAccountId || null,
    asOfDate: asOfDate || null,
  }) as Account[];

  if (!otherSelectedAccountId) return options;
  return options.filter((account) => account.id !== otherSelectedAccountId);
};

/**
 * After a type switch, keep a slot value only when it is still selectable for
 * the new type. Do not preserve archived/ineligible rows — that would hide a
 * stale UUID behind the empty state and submit an invalid write.
 */
export const resolveTransactionFormAccountIdForSlot = ({
  type,
  slot,
  accounts,
  accountId,
  asOfDate,
}: {
  type: TransactionType;
  slot: TransactionAccountSlot;
  accounts: readonly Account[];
  accountId: string;
  asOfDate?: string | null;
}): string => {
  if (!accountId) return '';

  const eligible = getTransactionFormAccountOptions({
    type,
    slot,
    accounts,
    asOfDate,
  });

  if (eligible.length === 0) return '';
  return eligible.some((account) => account.id === accountId) ? accountId : '';
};
