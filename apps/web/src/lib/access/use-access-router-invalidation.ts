import { useRouter } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { accessKey } from './access-key';
import { useAccess } from './AccessProvider';
import { shouldInvalidateRouterOnAccessChange } from './should-invalidate-router-on-access-change';

export const useAccessRouterInvalidation = () => {
  const router = useRouter();
  const { access, isReady } = useAccess();
  const previousAccessKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (import.meta.env.SSR) {
      return;
    }

    const currentAccessKey = accessKey(access);
    const shouldInvalidate = shouldInvalidateRouterOnAccessChange({
      previousAccessKey: previousAccessKeyRef.current,
      access,
      isReady,
      routerContextReady: router.options.context.isReady,
    });

    if (shouldInvalidate) {
      void router.invalidate();
    }

    previousAccessKeyRef.current = currentAccessKey;
  }, [access, isReady, router]);
};
