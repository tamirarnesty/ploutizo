import { useAuth } from '@clerk/tanstack-react-start';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { claimsMatchAccess, toAccessState } from './access-state';
import {
  endWorkingSet,
  setClientBearerGetter,
  setLiveAccess,
} from './working-set';
import type { AccessState } from './access-state';
import type { ReactNode } from 'react';

type AccessContextValue = {
  access: AccessState;
  isReady: boolean;
};

const AccessContext = createContext<AccessContextValue | null>(null);

export const useAccess = (): AccessContextValue => {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within AccessProvider');
  }
  return context;
};

const accessKey = (access: AccessState): string => {
  if (access.status === 'signed-out') {
    return 'signed-out';
  }
  if (access.status === 'signed-in-no-household') {
    return `member:${access.signedInMemberId}`;
  }
  return `household:${access.signedInMemberId}:${access.activeHouseholdId}`;
};

export const AccessProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, userId, orgId, getToken } = useAuth();
  const [isReady, setIsReady] = useState(import.meta.env.SSR);
  const previousAccessKeyRef = useRef<string | undefined>(undefined);

  const access = useMemo(
    () =>
      toAccessState({
        isAuthenticated: Boolean(isSignedIn),
        userId,
        orgId,
      }),
    [isSignedIn, userId, orgId]
  );

  const currentAccessKey = accessKey(access);

  useEffect(() => {
    if (import.meta.env.SSR) {
      return;
    }

    if (!isLoaded) {
      setIsReady(false);
      setLiveAccess(null);
      setClientBearerGetter(null);
      return;
    }

    const identityChanged =
      previousAccessKeyRef.current !== undefined &&
      previousAccessKeyRef.current !== currentAccessKey;

    if (identityChanged) {
      endWorkingSet();
    }
    previousAccessKeyRef.current = currentAccessKey;

    if (access.status === 'signed-out') {
      setLiveAccess(access);
      setClientBearerGetter(null);
      setIsReady(true);
      return;
    }

    setLiveAccess(access);
    setClientBearerGetter(getToken);

    let cancelled = false;
    const validateToken = async () => {
      setIsReady(false);
      for (const options of [undefined, { skipCache: true }]) {
        const token = await getToken(options);
        if (cancelled) {
          return;
        }
        if (token && claimsMatchAccess(token, access)) {
          setIsReady(true);
          return;
        }
      }
      if (!cancelled) {
        setIsReady(false);
      }
    };

    void validateToken();

    return () => {
      cancelled = true;
    };
  }, [access, currentAccessKey, getToken, isLoaded]);

  const value = useMemo(
    () => ({
      access,
      isReady,
    }),
    [access, isReady]
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
};
