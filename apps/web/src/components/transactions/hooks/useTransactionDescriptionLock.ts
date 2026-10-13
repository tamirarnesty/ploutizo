import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useStore } from '@tanstack/react-form';
import { formatGeneratedTransactionDescriptionFromAccounts } from '@ploutizo/utils/transaction-policy';
import type { Account, TransactionRow } from '@ploutizo/validators';
import { useGetTransaction } from '@/lib/data-access/transactions';
import { resolveTransactionFormDescriptionLock } from '../getTransactionFormDescriptionLock';
import {
  descriptionLockGenerationKey,
  getEditManualUnlockedGenerationKey,
  shouldUseGeneratedTransactionDescription,
} from '../transactionDescriptionLockState';
import type { TransactionFormInstance } from './useTransactionForm';

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

  const lockGeneration = descriptionLockGenerationKey(type, refundOf);
  const [manualUnlockedGeneration, setManualUnlockedGeneration] = useState<
    string | null
  >(() =>
    transaction
      ? getEditManualUnlockedGenerationKey(transaction, accounts)
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

  const previousGeneratedRef = useRef(lockedValue);
  const transitionRef = useRef({ type, refundOf });

  const typeChanged = transitionRef.current.type !== type;
  const refundOfChanged = transitionRef.current.refundOf !== refundOf;
  const manualUnlocked = manualUnlockedGeneration === lockGeneration;

  const previousGeneratedCandidate =
    typeChanged || (refundOfChanged && !manualUnlocked)
      ? description
      : previousGeneratedRef.current;

  const lockResolution = resolveTransactionFormDescriptionLock({
    type,
    refundOf,
    currentDescription: description,
    generatedCandidate: lockedValue,
    previousGeneratedCandidate,
    userUnlocked: typeChanged ? false : manualUnlocked,
  });

  useLayoutEffect(() => {
    if (transitionRef.current.type !== type) {
      setManualUnlockedGeneration(null);
    }
    transitionRef.current = { type, refundOf };
    previousGeneratedRef.current = lockedValue;
  }, [type, refundOf, lockedValue]);

  const isDescriptionUnlocked = manualUnlocked || lockResolution.userUnlocked;
  const shouldLock = shouldUseGeneratedTransactionDescription(type, refundOf);
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
    setManualUnlockedGeneration(descriptionLockGenerationKey(type, refundOf));
  }, [refundOf, type]);

  return { isLocked, lockedValue, unlockDescription };
};
