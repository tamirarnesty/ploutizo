import './working-set-cleanup';
import { useAuth } from '@clerk/tanstack-react-start';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { accessKey } from './access-key';
import { toAccessState } from './access-state';
import {
  getActiveQueryClient,
  subscribeWorkingSet,
} from './working-set-registry';
import { publishAccessRouterContext } from './access-router-context-store';
import { useAccessSnapshotLifecycle } from './use-access-snapshot-lifecycle';
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
  const [retryCount, setRetryCount] = useState(0);

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

  const queryClient = useSyncExternalStore(
    subscribeWorkingSet,
    getActiveQueryClient,
    getActiveQueryClient
  );

  const { isReady, bearerError } = useAccessSnapshotLifecycle({
    isLoaded,
    access,
    currentAccessKey,
    getToken,
    retryCount,
  });

  const retryBearer = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  const routerContext = useMemo(
    () => ({
      access,
      identityLoaded: isLoaded,
      isReady,
      queryClient,
    }),
    [access, isLoaded, isReady, queryClient]
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
