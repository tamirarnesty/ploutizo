import './working-set-cleanup';
import { useAuth } from '@clerk/tanstack-react-start';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { accessKey } from './access-key';
import { toAccessState } from './access-state';
import { resolveTransitionBearer } from './resolve-transition-bearer';
import {
  getActiveQueryClient,
  replaceActiveWorkingSet,
  subscribeWorkingSet,
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
  const trackedAccessKey = previousAccessKeyRef.current;
  const identityChanged =
    trackedAccessKey !== undefined && trackedAccessKey !== currentAccessKey;

  const queryClient = useSyncExternalStore(
    subscribeWorkingSet,
    getActiveQueryClient,
    getActiveQueryClient
  );

  useLayoutEffect(() => {
    if (import.meta.env.SSR) {
      return;
    }

    const priorAccessKey = previousAccessKeyRef.current;
    const didIdentityChange =
      priorAccessKey !== undefined && priorAccessKey !== currentAccessKey;

    if (!isLoaded) {
      setLiveAccess(null);
      setClientBearerGetter(null);
      previousAccessKeyRef.current = currentAccessKey;
      return;
    }

    if (didIdentityChange) {
      replaceActiveWorkingSet();
    }

    setLiveAccess(access);
    setClientBearerGetter(access.status === 'signed-out' ? null : getToken);
    previousAccessKeyRef.current = currentAccessKey;
  }, [isLoaded, access, currentAccessKey, getToken]);

  useLayoutEffect(() => {
    if (import.meta.env.SSR) {
      return;
    }

    if (!isLoaded) {
      setIsReady(false);
      setBearerError(false);
      return;
    }

    if (access.status === 'signed-out') {
      setIsReady(true);
      setBearerError(false);
      return;
    }

    setIsReady(false);
    setBearerError(false);
  }, [isLoaded, currentAccessKey, access.status]);

  const effectiveReady =
    identityChanged && access.status !== 'signed-out' ? false : isReady;

  const retryBearer = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

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

  const routerContext = useMemo(
    () => ({
      access,
      identityLoaded,
      isReady: effectiveReady,
      queryClient,
    }),
    [access, identityLoaded, effectiveReady, queryClient]
  );

  useLayoutEffect(() => {
    if (import.meta.env.SSR) {
      return;
    }
    publishAccessRouterContext(routerContext);
  }, [routerContext]);

  const value = useMemo(
    () => ({
      ...routerContext,
      bearerError,
      retryBearer,
    }),
    [routerContext, bearerError, retryBearer]
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
};
