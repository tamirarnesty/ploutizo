import { formatGeneratedTransactionDescriptionFromAccounts } from '@ploutizo/utils/transaction-policy';
import type { TransactionType } from '@ploutizo/types';
import type { Account, TransactionRow } from '@ploutizo/validators';
import { resolveTransactionFormDescriptionLock } from './getTransactionFormDescriptionLock';

export const descriptionLockGenerationKey = (
  type: TransactionType,
  refundOf: string
) => `${type}\0${refundOf}`;

/** Whether the description field should use generated policy for this type/refund link. */
export const shouldUseGeneratedTransactionDescription = (
  type: TransactionType,
  refundOf?: string | null
): boolean =>
  resolveTransactionFormDescriptionLock({
    type,
    refundOf,
    currentDescription: '',
    generatedCandidate: '',
  }).shouldLock;

/**
 * When editing, returns the lock generation key if the saved description counts
 * as a manual unlock; otherwise null (stay locked to generated template).
 */
export const getEditManualUnlockedGenerationKey = (
  transaction: TransactionRow,
  accounts: Account[]
): string | null => {
  const generatedCandidate = formatGeneratedTransactionDescriptionFromAccounts(
    {
      type: transaction.type,
      accountId: transaction.accountId,
      counterpartAccountId: transaction.counterpartAccountId ?? '',
      refundOf: transaction.refundOf ?? '',
      accountName: transaction.accountName,
      counterpartAccountName: transaction.counterpartAccountName,
    },
    accounts
  );
  const { userUnlocked } = resolveTransactionFormDescriptionLock({
    type: transaction.type,
    refundOf: transaction.refundOf ?? '',
    currentDescription: transaction.description,
    generatedCandidate,
  });
  return userUnlocked
    ? descriptionLockGenerationKey(transaction.type, transaction.refundOf ?? '')
    : null;
};
