import { useRouter } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { accessKey } from './access-key';
import { useAccess } from './AccessProvider';

export const useAccessRouterInvalidation = () => {
  const router = useRouter();
  const { access, isReady } = useAccess();
  const previousAccessKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (import.meta.env.SSR) {
      return;
    }

    const currentAccessKey = accessKey(access);
    const trackedAccessKey = previousAccessKeyRef.current;
    const identityChanged =
      trackedAccessKey !== undefined && trackedAccessKey !== currentAccessKey;

    const readinessBecameReady = !router.options.context.isReady && isReady;
    const shouldInvalidate =
      identityChanged ||
      (readinessBecameReady &&
        access.status !== 'signed-in-with-active-household');

    if (shouldInvalidate) {
      void router.invalidate();
    }

    previousAccessKeyRef.current = currentAccessKey;
  }, [access, isReady, router]);
};
