import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useStore } from '@tanstack/react-form';
import { formatGeneratedTransactionDescriptionFromAccounts } from '@ploutizo/utils/transaction-policy';
import type { TransactionType } from '@ploutizo/types';
import type { Account, TransactionRow } from '@ploutizo/validators';
import { useGetTransaction } from '@/lib/data-access/transactions';
import { resolveTransactionFormDescriptionLock } from '../getTransactionFormDescriptionLock';
import type { TransactionFormInstance } from './useTransactionForm';

const lockGenerationKey = (type: TransactionType, refundOf: string) =>
  `${type}\0${refundOf}`;

const isGeneratedDescriptionType = (
  type: TransactionType,
  refundOf?: string | null
): boolean =>
  resolveTransactionFormDescriptionLock({
    type,
    refundOf,
    currentDescription: '',
    generatedCandidate: '',
  }).shouldLock;

const initialDescriptionUnlocked = (
  transaction: TransactionRow | null,
  accounts: Account[]
): boolean => {
  if (transaction === null) return false;
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
  return resolveTransactionFormDescriptionLock({
    type: transaction.type,
    refundOf: transaction.refundOf ?? '',
    currentDescription: transaction.description,
    generatedCandidate,
  }).userUnlocked;
};

interface UseTransactionDescriptionLockOptions {
  form: TransactionFormInstance;
  accounts: Account[];
  transaction: TransactionRow | null;
}

/**
 * Locked/generated description state for transfer, settlement, contribution
 * and linked-refund transactions (D-11, D-12). Writes the generated template
 * into the description field, and keeps a manual unlock until the type moves
 * away from a locked type.
 */
export const useTransactionDescriptionLock = ({
  form,
  accounts,
  transaction,
}: UseTransactionDescriptionLockOptions) => {
  const type = useStore(form.store, (state) => state.values.type);
  const accountId = useStore(form.store, (state) => state.values.accountId);
  const counterpartAccountId = useStore(
    form.store,
    (state) => state.values.counterpartAccountId
  );
  const refundOf = useStore(form.store, (state) => state.values.refundOf);
  const description = useStore(form.store, (state) => state.values.description);

  const lockGeneration = lockGenerationKey(type, refundOf);
  const [manualUnlockedGeneration, setManualUnlockedGeneration] = useState<
    string | null
  >(() =>
    transaction && initialDescriptionUnlocked(transaction, accounts)
      ? lockGenerationKey(transaction.type, transaction.refundOf ?? '')
      : null
  );

  const { data: refundOriginal } = useGetTransaction(refundOf || null);
  const refundOriginalDescription = refundOf
    ? (refundOriginal?.description ?? '')
    : '';

  const lockedValue = formatGeneratedTransactionDescriptionFromAccounts(
    {
      type,
      accountId,
      counterpartAccountId,
      refundOf,
      accountName: transaction?.accountName,
      counterpartAccountName: transaction?.counterpartAccountName,
      refundOriginalDescription,
    },
    accounts
  );

  const trackingRef = useRef({
    type,
    refundOf,
    previousGeneratedCandidate: lockedValue,
  });

  const typeChanged = trackingRef.current.type !== type;
  const refundOfChanged = trackingRef.current.refundOf !== refundOf;
  const manualUnlocked = manualUnlockedGeneration === lockGeneration;

  let previousGeneratedCandidate =
    trackingRef.current.previousGeneratedCandidate;
  if (typeChanged || (refundOfChanged && !manualUnlocked)) {
    previousGeneratedCandidate = description;
  }

  const lockResolution = resolveTransactionFormDescriptionLock({
    type,
    refundOf,
    currentDescription: description,
    generatedCandidate: lockedValue,
    previousGeneratedCandidate,
    userUnlocked: typeChanged ? false : manualUnlocked,
  });

  useLayoutEffect(() => {
    trackingRef.current = {
      type,
      refundOf,
      previousGeneratedCandidate: lockedValue,
    };
  });

  const isDescriptionUnlocked = manualUnlocked || lockResolution.userUnlocked;
  const shouldLock = isGeneratedDescriptionType(type, refundOf);
  const isLocked = !isDescriptionUnlocked && shouldLock;

  useEffect(() => {
    const currentDescription = form.getFieldValue('description');
    if (
      lockResolution.locked &&
      lockResolution.description &&
      lockResolution.description !== currentDescription
    ) {
      form.setFieldValue('description', lockResolution.description);
    }
  }, [form, lockResolution.description, lockResolution.locked]);

  const unlockDescription = useCallback(() => {
    setManualUnlockedGeneration(lockGenerationKey(type, refundOf));
  }, [refundOf, type]);

  return { isLocked, lockedValue, unlockDescription };
};
