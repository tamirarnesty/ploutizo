/** `undefined` means Clerk has not produced a loaded snapshot yet. */
export const shouldClearSessionQueryCache = (
  isLoaded: boolean,
  previousUserId: string | null | undefined,
  userId: string | null | undefined
): { shouldClear: boolean; nextUserId: string | null | undefined } => {
  if (!isLoaded) {
    return { shouldClear: false, nextUserId: previousUserId };
  }

  const nextUserId = userId ?? null;
  if (previousUserId === undefined) {
    return { shouldClear: false, nextUserId };
  }

  return {
    shouldClear: previousUserId !== nextUserId,
    nextUserId,
  };
};
