import { useAuth } from '@clerk/tanstack-react-start';
import { useEffect, useRef } from 'react';
import { clearSessionQueryCache } from '@/lib/queryClient';
import { shouldClearSessionQueryCache } from './shouldClearSessionQueryCache';

export const useClearSessionQueryCache = () => {
  const { isLoaded, userId } = useAuth();
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const { shouldClear, nextUserId } = shouldClearSessionQueryCache(
      isLoaded,
      previousUserIdRef.current,
      userId
    );
    previousUserIdRef.current = nextUserId;
    if (shouldClear) {
      clearSessionQueryCache();
    }
  }, [isLoaded, userId]);
};
