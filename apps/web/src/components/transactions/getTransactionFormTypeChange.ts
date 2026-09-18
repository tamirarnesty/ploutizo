import {
  getTransactionFieldsToClear,
  getTransactionTypePolicy,
} from '@ploutizo/utils/transaction-policy';
import type { Account, TransactionType } from '@ploutizo/types';
import { resolveTransactionFormAccountIdForSlot } from './getTransactionFormAccountOptions';
import type { TransactionFormValues } from './types';

export type TransactionFormTypeChangeValues = Pick<
  TransactionFormValues,
  | 'accountId'
  | 'counterpartAccountId'
  | 'categoryId'
  | 'refundOf'
  | 'incomeType'
>;

/**
 * Policy-derived field cleanup after a type switch: clear irrelevant scalars
 * and account slots, then keep remaining slot values only when they are still
 * selectable for the new type.
 */
export const getTransactionFormTypeChangePatch = ({
  type,
  accounts,
  values,
  asOfDate,
}: {
  type: TransactionType;
  accounts: readonly Account[];
  values: TransactionFormTypeChangeValues;
  asOfDate?: string | null;
}): Partial<TransactionFormTypeChangeValues> => {
  const patch: Partial<TransactionFormTypeChangeValues> = {};

  for (const field of getTransactionFieldsToClear(type)) {
    if (field === 'notes') continue;
    patch[field] = '';
  }

  const nextValues = { ...values, ...patch };
  for (const slot of getTransactionTypePolicy(type).accountSlots) {
    const resolved = resolveTransactionFormAccountIdForSlot({
      type,
      slot: slot.field,
      accounts,
      accountId: nextValues[slot.field],
      asOfDate,
    });
    if (resolved !== values[slot.field]) {
      patch[slot.field] = resolved;
    }
  }

  return patch;
};
