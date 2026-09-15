import type { CacheIdentity } from './access-policy';

/** `undefined` previous identity means Clerk has not produced a loaded snapshot yet. */
export const shouldClearSessionQueryCache = (
  isLoaded: boolean,
  previous: CacheIdentity | undefined,
  next: CacheIdentity
): { shouldClear: boolean; nextIdentity: CacheIdentity | undefined } => {
  if (!isLoaded) {
    return { shouldClear: false, nextIdentity: previous };
  }

  if (previous === undefined) {
    if (next.signedInMemberId === null) {
      return { shouldClear: false, nextIdentity: undefined };
    }
    return { shouldClear: false, nextIdentity: next };
  }

  if (
    previous.signedInMemberId === next.signedInMemberId &&
    previous.activeHouseholdId === next.activeHouseholdId
  ) {
    return { shouldClear: false, nextIdentity: previous };
  }

  return {
    shouldClear: true,
    nextIdentity: next,
  };
};
