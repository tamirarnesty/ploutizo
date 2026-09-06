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
