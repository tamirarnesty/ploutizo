import {
  resolveTransactionDescriptionLock,
  resolveTransactionDescriptionPolicy,
} from '@ploutizo/utils/transaction-policy';
import type {
  ResolveTransactionDescriptionLockInput,
  ResolvedTransactionDescriptionLock,
} from '@ploutizo/utils/transaction-policy';

export type TransactionFormDescriptionLock =
  ResolvedTransactionDescriptionLock & {
    /** True when policy mode is generated, before sticky unlock is applied. */
    shouldLock: boolean;
  };

/**
 * Form-facing description lock orchestration. Always asks policy for the
 * effective mode, then lock for match/mismatch/sticky-manual state.
 */
export const resolveTransactionFormDescriptionLock = (
  input: ResolveTransactionDescriptionLockInput
): TransactionFormDescriptionLock => {
  const { mode } = resolveTransactionDescriptionPolicy({
    type: input.type,
    refundOf: input.refundOf,
  });
  const lock = resolveTransactionDescriptionLock(input);

  return {
    ...lock,
    policyMode: mode,
    shouldLock: mode === 'generated',
  };
};
