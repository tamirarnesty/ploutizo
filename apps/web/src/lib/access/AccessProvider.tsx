import './working-set-cleanup';
import { useAuth } from '@clerk/tanstack-react-start';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toAccessState } from './access-state';
import { resolveMatchingBearer } from './resolve-matching-bearer';
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
  bearerError: boolean;
  retryBearer: () => void;
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
  const [isReady, setIsReady] = useState(false);
  const [bearerError, setBearerError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
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
  const retryBearer = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  // Sync during render — not in an effect — so route children in the same commit
  // cannot read the previous household's cache on identity switch.
  if (!import.meta.env.SSR) {
    const trackedAccessKey = previousAccessKeyRef.current;
    const identityChanged =
      trackedAccessKey !== undefined && trackedAccessKey !== currentAccessKey;

    if (!isLoaded) {
      setLiveAccess(null);
      setClientBearerGetter(null);
      if (isReady) {
        setIsReady(false);
      }
      if (bearerError) {
        setBearerError(false);
      }
    } else {
      if (identityChanged) {
        endWorkingSet();
        setBearerError(false);
      }

      setLiveAccess(access);
      setClientBearerGetter(access.status === 'signed-out' ? null : getToken);

      if (access.status === 'signed-out') {
        if (!isReady) {
          setIsReady(true);
        }
        if (bearerError) {
          setBearerError(false);
        }
      } else if (identityChanged || trackedAccessKey === undefined) {
        setIsReady(false);
      }
    }

    previousAccessKeyRef.current = currentAccessKey;
  }

  useEffect(() => {
    if (import.meta.env.SSR || !isLoaded || access.status === 'signed-out') {
      return;
    }

    let cancelled = false;
    const validateToken = async () => {
      const token = await resolveMatchingBearer(getToken, access);
      if (cancelled) {
        return;
      }
      if (token) {
        setBearerError(false);
        setIsReady(true);
        return;
      }
      setBearerError(true);
      setIsReady(false);
    };

    void validateToken();

    return () => {
      cancelled = true;
    };
  }, [access, currentAccessKey, getToken, isLoaded, retryCount]);

  const boundaryReady = import.meta.env.SSR ? isLoaded : isReady;

  const value = useMemo(
    () => ({
      access,
      isReady: boundaryReady,
      bearerError,
      retryBearer,
    }),
    [access, boundaryReady, bearerError, retryBearer]
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
};
