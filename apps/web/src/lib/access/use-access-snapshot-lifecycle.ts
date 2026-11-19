import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { hydrateOfflineRead } from '@/lib/offline/offline-collections';
import {
  clearRememberedHousehold,
  writeRememberedHousehold,
} from '@/lib/offline/remembered-household';
import { syncBrowserPersistence } from '@/lib/persistence/browser-persistence';
import { hasAccessIdentityChanged } from './access-key';
import { claimsMatchAccess } from './bearer-claims';
import { replaceActiveWorkingSet } from './working-set-registry';
import { setClientBearerGetter, setLiveAccess } from './working-set';
import type { AccessState } from './access-state';

type ReadinessState = {
  isReady: boolean;
  bearerError: boolean;
};

type ReadinessAction =
  | { type: 'clerk-loading' }
  | { type: 'signed-out-ready' }
  | { type: 'identity-transition' }
  | { type: 'bearer-ready' }
  | { type: 'bearer-failed' };

const initialReadiness: ReadinessState = {
  isReady: false,
  bearerError: false,
};

const readinessReducer = (
  _state: ReadinessState,
  action: ReadinessAction
): ReadinessState => {
  switch (action.type) {
    case 'clerk-loading':
      return { isReady: false, bearerError: false };
    case 'signed-out-ready':
      return { isReady: true, bearerError: false };
    case 'identity-transition':
      return { isReady: false, bearerError: false };
    case 'bearer-ready':
      return { isReady: true, bearerError: false };
    case 'bearer-failed':
      return { isReady: false, bearerError: true };
    default:
      return _state;
  }
};

type UseAccessSnapshotLifecycleInput = {
  isLoaded: boolean;
  access: AccessState;
  currentAccessKey: string;
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>;
  retryCount: number;
  /** Skip Clerk while the device is offline. */
  offline?: boolean;
  /**
   * The member already opened this household from local data. A missing token
   * once the network is back means the session expired.
   */
  revalidateOfflineLaunch?: boolean;
  onSessionExpired?: () => void;
  onOfflineLaunchValidated?: () => void;
};

export const useAccessSnapshotLifecycle = ({
  isLoaded,
  access,
  currentAccessKey,
  getToken,
  retryCount,
  offline = false,
  revalidateOfflineLaunch = false,
  onSessionExpired,
  onOfflineLaunchValidated,
}: UseAccessSnapshotLifecycleInput) => {
  const [readiness, dispatch] = useReducer(readinessReducer, initialReadiness);
  const previousAccessKeyRef = useRef<string | undefined>(undefined);
  const syncedAccessKeyRef = useRef<string | null>(null);

  const identityChanged = hasAccessIdentityChanged(
    previousAccessKeyRef.current,
    currentAccessKey
  );

  const isReady =
    identityChanged && access.status !== 'signed-out'
      ? false
      : readiness.isReady;

  useLayoutEffect(() => {
    if (import.meta.env.SSR) {
      return;
    }

    const priorAccessKey = previousAccessKeyRef.current;
    const didIdentityChange = hasAccessIdentityChanged(
      priorAccessKey,
      currentAccessKey
    );

    if (!isLoaded) {
      setLiveAccess(null);
      setClientBearerGetter(null);
      dispatch({ type: 'clerk-loading' });
      previousAccessKeyRef.current = currentAccessKey;
      return;
    }

    if (didIdentityChange) {
      replaceActiveWorkingSet();
    }

    setLiveAccess(access);
    setClientBearerGetter(
      offline || access.status === 'signed-out' ? null : getToken
    );
    previousAccessKeyRef.current = currentAccessKey;

    // A Clerk load looks signed out. Syncing then would wipe the database
    // before the signed-in member is known. Sync only a resolved access key.
    // Offline signed-out is not a resolved sign-out: the remembered household
    // stays on disk until an online check says the session is gone.
    const wipe = access.status === 'signed-out' && !offline;
    if (
      syncedAccessKeyRef.current !== currentAccessKey &&
      (access.status !== 'signed-out' || wipe)
    ) {
      syncedAccessKeyRef.current = currentAccessKey;
      void syncBrowserPersistence(access);
      if (wipe) {
        clearRememberedHousehold();
      } else if (
        !offline &&
        access.status === 'signed-in-with-active-household'
      ) {
        writeRememberedHousehold({
          signedInMemberId: access.signedInMemberId,
          activeHouseholdId: access.activeHouseholdId,
        });
      }
    }

    if (access.status === 'signed-in-with-active-household') {
      void hydrateOfflineRead();
    }

    if (offline && access.status === 'signed-in-with-active-household') {
      dispatch({ type: 'bearer-ready' });
      return;
    }

    if (access.status === 'signed-out') {
      dispatch({ type: 'signed-out-ready' });
      return;
    }

    if (didIdentityChange) {
      dispatch({ type: 'identity-transition' });
    }
  }, [isLoaded, access, currentAccessKey, getToken, offline]);

  useEffect(() => {
    if (
      import.meta.env.SSR ||
      !isLoaded ||
      offline ||
      access.status === 'signed-out'
    ) {
      return;
    }

    let cancelled = false;
    const validateToken = async () => {
      try {
        const token = await getToken({ skipCache: true });
        if (cancelled) return;
        if (!token) {
          if (revalidateOfflineLaunch) {
            onSessionExpired?.();
            return;
          }
          dispatch({ type: 'bearer-failed' });
          return;
        }
        if (!claimsMatchAccess(token, access)) {
          dispatch({ type: 'bearer-failed' });
          return;
        }
        onOfflineLaunchValidated?.();
        dispatch({ type: 'bearer-ready' });
        return;
      } catch {
        if (cancelled) return;
      }
      dispatch({ type: 'bearer-failed' });
    };

    void validateToken();

    return () => {
      cancelled = true;
    };
  }, [
    access,
    currentAccessKey,
    getToken,
    isLoaded,
    offline,
    onOfflineLaunchValidated,
    onSessionExpired,
    revalidateOfflineLaunch,
    retryCount,
  ]);

  return {
    isReady,
    bearerError: readiness.bearerError,
  };
};
