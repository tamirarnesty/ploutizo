import { useRouter } from '@tanstack/react-router';
import { useRef } from 'react';
import { accessKey } from './access-key';
import { replaceActiveWorkingSet } from './working-set-registry';
import { useAccess } from './AccessProvider';

export const AccessRouterBridge = () => {
  const router = useRouter();
  const { access, isReady } = useAccess();
  const previousAccessKeyRef = useRef<string | undefined>(undefined);

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

  if (contextChanged) {
    router.update({
      context: {
        ...router.options.context,
        queryClient,
        access,
        isReady,
      },
    });
    if (identityChanged || readinessBecameReady) {
      void router.invalidate();
    }
  }

  previousAccessKeyRef.current = currentAccessKey;

  return null;
};
