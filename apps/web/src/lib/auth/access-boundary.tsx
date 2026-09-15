import { useAuth } from '@clerk/tanstack-react-start';
import { useState } from 'react';
import { clearSessionQueryCache } from '@/lib/queryClient';
import { cacheIdentityFromAccess, toAccessState } from './access-policy';
import {
  rememberClientBearer,
  setClientBearerGetter,
} from './get-bearer-token';
import { shouldClearSessionQueryCache } from './shouldClearSessionQueryCache';
import type { CacheIdentity } from './access-policy';

export const useAccessBoundary = () => {
  const { isLoaded, isSignedIn, userId, orgId, getToken } = useAuth();
  const [previousIdentity, setPreviousIdentity] = useState<
    CacheIdentity | undefined
  >(undefined);

  if (import.meta.env.SSR) {
    return;
  }

  const access = toAccessState({
    isAuthenticated: Boolean(isSignedIn),
    userId,
    orgId,
  });
  const nextIdentity = cacheIdentityFromAccess(access);

  const { shouldClear, nextIdentity: storedIdentity } =
    shouldClearSessionQueryCache(isLoaded, previousIdentity, nextIdentity);

  if (previousIdentity !== storedIdentity) {
    if (shouldClear) {
      clearSessionQueryCache();
    }
    setPreviousIdentity(storedIdentity);
  }

  if (!isLoaded) {
    return;
  }

  if (!isSignedIn) {
    setClientBearerGetter(null);
    if (shouldClear) {
      rememberClientBearer(null);
    }
    return;
  }

  setClientBearerGetter(() => getToken());
};

export const AccessBoundary = () => {
  useAccessBoundary();
  return null;
};
