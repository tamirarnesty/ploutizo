/**
 * Draft GET backs a writable TanStack DB rows collection. Background refetches
 * replace full collection state and drop session-only fields; refetch only via
 * explicit invalidate (e.g. prepareAgain) or first fetch when cache is cold.
 */
export const importDraftClientQueryPolicy = {
  staleTime: Number.POSITIVE_INFINITY,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;
