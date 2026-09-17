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
import { accessKey } from './access-key';
import { toAccessState } from './access-state';
import { resolveTransitionBearer } from './resolve-transition-bearer';
import {
  getActiveQueryClient,
  replaceActiveWorkingSet,
} from './working-set-registry';
import { publishAccessRouterContext } from './access-router-context-store';
import { setClientBearerGetter, setLiveAccess } from './working-set';
import type { AccessState } from './access-state';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export type AccessSnapshot = {
  access: AccessState;
  identityLoaded: boolean;
  isReady: boolean;
  queryClient: QueryClient;
};

export type AccessContextValue = AccessSnapshot & {
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

export const AccessProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, userId, orgId, getToken } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [bearerError, setBearerError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [workingSetVersion, setWorkingSetVersion] = useState(0);
  const previousAccessKeyRef = useRef<string | undefined>(undefined);

  const identityLoaded = isLoaded;

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
        replaceActiveWorkingSet();
        setWorkingSetVersion((version) => version + 1);
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

  const queryClient = useMemo(
    () => getActiveQueryClient(),
    [workingSetVersion, currentAccessKey]
  );

  useEffect(() => {
    if (import.meta.env.SSR || !isLoaded || access.status === 'signed-out') {
      return;
    }

    let cancelled = false;
    const validateToken = async () => {
      try {
        const token = await resolveTransitionBearer(getToken, access);
        if (cancelled) {
          return;
        }
        if (token) {
          setBearerError(false);
          setIsReady(true);
          return;
        }
      } catch {
        if (cancelled) {
          return;
        }
      }
      setBearerError(true);
      setIsReady(false);
    };

    void validateToken();

    return () => {
      cancelled = true;
    };
  }, [access, currentAccessKey, getToken, isLoaded, retryCount]);

  const value = useMemo(
    () => ({
      access,
      identityLoaded,
      isReady,
      queryClient,
      bearerError,
      retryBearer,
    }),
    [access, identityLoaded, isReady, queryClient, bearerError, retryBearer]
  );

  useEffect(() => {
    if (import.meta.env.SSR) {
      return;
    }

    publishAccessRouterContext({
      access,
      identityLoaded,
      isReady,
      queryClient,
    });
  }, [access, identityLoaded, isReady, queryClient]);

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
};
