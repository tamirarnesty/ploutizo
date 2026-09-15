import { useAuth } from '@clerk/tanstack-react-start';
import { useRouteContext, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { clearSessionQueryCache } from '@/lib/queryClient';
import {
  cacheIdentityFromAccess,
  canResumeAccessWork,
  toAccessState,
} from './access-policy';
import {
  clearTransitionCredential,
  setClientAccessIdentity,
  setClientBearerGetter,
} from './get-bearer-token';
import { shouldClearSessionQueryCache } from './shouldClearSessionQueryCache';
import type { CacheIdentity } from './access-policy';
import type { ReactNode } from 'react';

export const useAccessBoundary = (): boolean => {
  const router = useRouter();
  const { access: routeAccess } = useRouteContext({ from: '__root__' });
  const { isLoaded, isSignedIn, userId, orgId, getToken } = useAuth();
  const [previousIdentity, setPreviousIdentity] = useState<
    CacheIdentity | undefined
  >(undefined);
  const [shouldInvalidateRouter, setShouldInvalidateRouter] = useState(false);

  useEffect(() => {
    if (!shouldInvalidateRouter) {
      return;
    }
    setShouldInvalidateRouter(false);
    void router.invalidate();
  }, [router, shouldInvalidateRouter]);

  if (import.meta.env.SSR) {
    return true;
  }

  const clerkAccess = toAccessState({
    isAuthenticated: Boolean(isSignedIn),
    userId,
    orgId,
  });
  const nextIdentity = cacheIdentityFromAccess(clerkAccess);

  const { shouldClear, nextIdentity: storedIdentity } =
    shouldClearSessionQueryCache(isLoaded, previousIdentity, nextIdentity);

  if (previousIdentity !== storedIdentity) {
    if (shouldClear) {
      clearSessionQueryCache();
      clearTransitionCredential();
      setShouldInvalidateRouter(true);
    }
    setPreviousIdentity(storedIdentity);
  }

  if (!isLoaded) {
    return true;
  }

  setClientAccessIdentity(nextIdentity);

  if (!isSignedIn) {
    setClientBearerGetter(null);
    return canResumeAccessWork(isLoaded, clerkAccess, routeAccess);
  }

  setClientBearerGetter(() => getToken());
  return canResumeAccessWork(isLoaded, clerkAccess, routeAccess);
};

export const AccessBoundary = ({ children }: { children: ReactNode }) => {
  const resume = useAccessBoundary();
  if (!resume) {
    return null;
  }
  return children;
};
