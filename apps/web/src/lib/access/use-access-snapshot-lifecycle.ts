import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { hasAccessIdentityChanged } from './access-key';
import { resolveTransitionBearer } from './resolve-transition-bearer';
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
};

export const useAccessSnapshotLifecycle = ({
  isLoaded,
  access,
  currentAccessKey,
  getToken,
  retryCount,
}: UseAccessSnapshotLifecycleInput) => {
  const [readiness, dispatch] = useReducer(readinessReducer, initialReadiness);
  const previousAccessKeyRef = useRef<string | undefined>(undefined);

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
    setClientBearerGetter(access.status === 'signed-out' ? null : getToken);
    previousAccessKeyRef.current = currentAccessKey;

    if (access.status === 'signed-out') {
      dispatch({ type: 'signed-out-ready' });
      return;
    }

    if (didIdentityChange) {
      dispatch({ type: 'identity-transition' });
    }
  }, [isLoaded, access, currentAccessKey, getToken]);

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
          dispatch({ type: 'bearer-ready' });
          return;
        }
      } catch {
        if (cancelled) {
          return;
        }
      }
      dispatch({ type: 'bearer-failed' });
    };

    void validateToken();

    return () => {
      cancelled = true;
    };
  }, [access, currentAccessKey, getToken, isLoaded, retryCount]);

  return {
    isReady,
    bearerError: readiness.bearerError,
  };
};
