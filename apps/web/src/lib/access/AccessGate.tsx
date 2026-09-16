import { useAuth } from '@clerk/tanstack-react-start';
import { useRouteContext, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { isAccessAligned, sameAccess, toAccessState } from './access-state';
import {
  endWorkingSet,
  setClientBearerGetter,
  setLiveAccess,
} from './working-set';
import type { AccessState } from './access-state';
import type { ReactNode } from 'react';

const accessPairKey = (
  providerAccess: AccessState,
  routeAccess: AccessState | undefined
) => JSON.stringify({ providerAccess, routeAccess });

export const useAccessGate = (): boolean => {
  const router = useRouter();
  const { access: routeAccess } = useRouteContext({ from: '__root__' });
  const { isLoaded, isSignedIn, userId, orgId, getToken } = useAuth();
  const [previousAccess, setPreviousAccess] = useState<AccessState | undefined>(
    undefined
  );
  const [shouldInvalidateRouter, setShouldInvalidateRouter] = useState(false);
  const scheduledPair = useRef<string | null>(null);

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

  const providerAccess = toAccessState({
    isAuthenticated: Boolean(isSignedIn),
    userId,
    orgId,
  });

  if (!isLoaded) {
    setLiveAccess(null);
    return true;
  }

  setLiveAccess(providerAccess);

  if (!isSignedIn) {
    setClientBearerGetter(null);
  } else {
    setClientBearerGetter(() => getToken({ skipCache: true }));
  }

  const identityChanged =
    previousAccess !== undefined && !sameAccess(previousAccess, providerAccess);
  if (previousAccess === undefined || identityChanged) {
    if (identityChanged) {
      endWorkingSet();
      setShouldInvalidateRouter(true);
    }
    setPreviousAccess(providerAccess);
  }

  const aligned = isAccessAligned(isLoaded, providerAccess, routeAccess);
  if (!aligned) {
    const pair = accessPairKey(providerAccess, routeAccess);
    if (scheduledPair.current !== pair) {
      scheduledPair.current = pair;
      endWorkingSet();
      if (!shouldInvalidateRouter) {
        setShouldInvalidateRouter(true);
      }
    }
    return false;
  }

  scheduledPair.current = null;
  return true;
};

export const AccessGate = ({ children }: { children: ReactNode }) => {
  const resume = useAccessGate();
  if (!resume) {
    return null;
  }
  return children;
};
