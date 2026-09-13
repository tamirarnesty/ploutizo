import { useAuth } from '@clerk/tanstack-react-start';
import { useState } from 'react';
import { clearSessionQueryCache } from '@/lib/queryClient';
import { shouldClearSessionQueryCache } from './shouldClearSessionQueryCache';

// Sync during render — not in an effect — so route children in the same commit
// cannot read the previous account's cache on a loaded-user switch.
export const useClearSessionQueryCache = () => {
  const { isLoaded, userId } = useAuth();
  const [previousUserId, setPreviousUserId] = useState<
    string | null | undefined
  >(undefined);

  const { shouldClear, nextUserId } = shouldClearSessionQueryCache(
    isLoaded,
    previousUserId,
    userId
  );

  if (previousUserId !== nextUserId) {
    if (shouldClear) {
      clearSessionQueryCache();
    }
    setPreviousUserId(nextUserId);
  }
};
