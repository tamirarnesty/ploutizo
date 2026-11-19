import './working-set-cleanup';
import { useAuth } from '@clerk/tanstack-react-start';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  getBrowserOfflineServerSnapshot,
  getBrowserOfflineSnapshot,
  subscribeBrowserOnline,
} from '@/lib/offline/browser-online';
import { presentAccess } from '@/lib/offline/present-access';
import {
  clearRememberedHousehold,
  readRememberedHousehold,
  subscribeRememberedHousehold,
  writeRememberedHousehold,
} from '@/lib/offline/remembered-household';
import { AccessContext } from './access-context';
import { accessKey } from './access-key';
import { toAccessState } from './access-state';
import {
  getActiveQueryClient,
  subscribeWorkingSet,
} from './working-set-registry';
import { publishAccessRouterContext } from './access-router-context-store';
import { useAccessSnapshotLifecycle } from './use-access-snapshot-lifecycle';
import type { ReactNode } from 'react';

export const AccessProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, userId, orgId, getToken, sessionId } =
    useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const [expiredSessionId, setExpiredSessionId] = useState<
    string | null | undefined
  >(undefined);
  const sawOfflineHousehold = useRef(false);

  const offline = useSyncExternalStore(
    subscribeBrowserOnline,
    getBrowserOfflineSnapshot,
    getBrowserOfflineServerSnapshot
  );
  const remembered = useSyncExternalStore(
    subscribeRememberedHousehold,
    readRememberedHousehold,
    () => null
  );

  const clerkAccess = useMemo(
    () =>
      toAccessState({
        isAuthenticated: Boolean(isSignedIn),
        userId,
        orgId,
      }),
    [isSignedIn, userId, orgId]
  );
  const expired =
    expiredSessionId !== undefined && expiredSessionId === (sessionId ?? null);
  const access = useMemo(
    () =>
      presentAccess({
        clerkLoaded: isLoaded,
        clerkAccess,
        offline,
        remembered,
        expired,
      }),
    [isLoaded, clerkAccess, offline, remembered, expired]
  );

  useEffect(() => {
    if (offline && access.status === 'signed-in-with-active-household') {
      sawOfflineHousehold.current = true;
    }
  }, [offline, access]);

  const currentAccessKey = accessKey(access);
  const identityLoaded =
    isLoaded ||
    (offline && access.status === 'signed-in-with-active-household') ||
    (offline && !remembered);

  const queryClient = useSyncExternalStore(
    subscribeWorkingSet,
    getActiveQueryClient,
    getActiveQueryClient
  );

  const handleSessionExpired = useCallback(() => {
    setExpiredSessionId(sessionId ?? null);
  }, [sessionId]);
  const handleOfflineLaunchValidated = useCallback(() => {
    sawOfflineHousehold.current = false;
  }, []);

  const { isReady, bearerError } = useAccessSnapshotLifecycle({
    isLoaded: identityLoaded,
    access,
    currentAccessKey,
    getToken,
    retryCount,
    offline,
    revalidateOfflineLaunch: sawOfflineHousehold.current,
    onSessionExpired: handleSessionExpired,
    onOfflineLaunchValidated: handleOfflineLaunchValidated,
  });

  useEffect(() => {
    if (!isLoaded || offline) return;
    if (!expired && clerkAccess.status === 'signed-in-with-active-household') {
      writeRememberedHousehold({
        signedInMemberId: clerkAccess.signedInMemberId,
        activeHouseholdId: clerkAccess.activeHouseholdId,
      });
      return;
    }
    if (expired || clerkAccess.status === 'signed-out') {
      clearRememberedHousehold();
    }
  }, [isLoaded, offline, expired, clerkAccess]);

  const retryBearer = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  const routerContext = useMemo(
    () => ({
      access,
      identityLoaded,
      isReady,
      queryClient,
    }),
    [access, identityLoaded, isReady, queryClient]
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
