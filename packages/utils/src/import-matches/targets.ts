import type { MatchTargetFact } from '@ploutizo/types';

/** True when a match-target fact belongs to the draft destination account. */
export const isImportMatchTargetOnAccount = (
  transaction: Pick<MatchTargetFact, 'accountId'> | null | undefined,
  targetAccountId: string
): boolean => transaction?.accountId === targetAccountId;
