import { useRouter } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { accessKey } from './access-key';
import { replaceActiveWorkingSet } from './working-set-registry';
import { useAccess } from './AccessProvider';

export const AccessRouterBridge = () => {
  const router = useRouter();
  const { access, isReady } = useAccess();
  const previousAccessKeyRef = useRef<string | undefined>(undefined);
  const pendingInvalidateRef = useRef(false);

  useEffect(() => {
    if (!pendingInvalidateRef.current) {
      return;
    }
    pendingInvalidateRef.current = false;
    void router.invalidate();
  }, [access, isReady, router]);

  if (import.meta.env.SSR) {
    return null;
  }

  const currentAccessKey = accessKey(access);
  const trackedAccessKey = previousAccessKeyRef.current;
  const identityChanged =
    trackedAccessKey !== undefined && trackedAccessKey !== currentAccessKey;

  let queryClient = router.options.context.queryClient;

  if (identityChanged) {
    queryClient = replaceActiveWorkingSet().queryClient;
  }

  const contextChanged =
    identityChanged ||
    router.options.context.access !== access ||
    router.options.context.isReady !== isReady ||
    router.options.context.queryClient !== queryClient;

  const readinessBecameReady = !router.options.context.isReady && isReady;
  // Household UI subscribes to queries as soon as the bearer is ready. Rematching
  // that tree cancels those observers and surfaces Query's CancelledError as a
  // route error. Identity changes still invalidate; household queries refetch
  // via useHouseholdQuery on this transition.
  const shouldInvalidate =
    identityChanged ||
    (readinessBecameReady &&
      access.status !== 'signed-in-with-active-household');

  if (contextChanged) {
    router.update({
      context: {
        ...router.options.context,
        queryClient,
        access,
        isReady,
      },
    });
    if (shouldInvalidate) {
      pendingInvalidateRef.current = true;
    }
  }

  previousAccessKeyRef.current = currentAccessKey;

  return null;
};
