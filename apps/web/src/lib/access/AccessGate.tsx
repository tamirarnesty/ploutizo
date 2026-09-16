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

export const useAccessGate = (): boolean => {
  const router = useRouter();
  const { access: routeAccess } = useRouteContext({ from: '__root__' });
  const { isLoaded, isSignedIn, userId, orgId, getToken } = useAuth();
  const [previousAccess, setPreviousAccess] = useState<AccessState | undefined>(
    undefined
  );
  const [shouldInvalidateRouter, setShouldInvalidateRouter] = useState(false);
  const hasScheduledMismatch = useRef(false);

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
    setClientBearerGetter(getToken);
  }

  const identityChanged =
    previousAccess !== undefined && !sameAccess(previousAccess, providerAccess);
  if (previousAccess === undefined || identityChanged) {
    if (identityChanged) {
      endWorkingSet();
      if (!shouldInvalidateRouter) {
        setShouldInvalidateRouter(true);
      }
    }
    setPreviousAccess(providerAccess);
  }

  const aligned = isAccessAligned(providerAccess, routeAccess);
  if (!aligned) {
    if (!hasScheduledMismatch.current) {
      hasScheduledMismatch.current = true;
      if (!identityChanged) {
        endWorkingSet();
      }
      if (!shouldInvalidateRouter) {
        setShouldInvalidateRouter(true);
      }
    }
    return false;
  }

  hasScheduledMismatch.current = false;
  return true;
};

export const AccessGate = ({ children }: { children: ReactNode }) => {
  const resume = useAccessGate();
  if (!resume) {
    return null;
  }
  return children;
};
