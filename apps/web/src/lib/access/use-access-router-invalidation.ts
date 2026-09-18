import { useRouter } from '@tanstack/react-router';
import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { accessKey } from './access-key';
import {
  getAccessRouterContext,
  getAccessRouterContextServerSnapshot,
  subscribeAccessRouterContext,
} from './access-router-context-store';
import { shouldInvalidateRouterOnAccessChange } from './should-invalidate-router-on-access-change';

export const useAccessRouterInvalidation = () => {
  const router = useRouter();
  const context = useSyncExternalStore(
    subscribeAccessRouterContext,
    getAccessRouterContext,
    getAccessRouterContextServerSnapshot
  );
  const previousPublishedContextRef = useRef(context);

  useLayoutEffect(() => {
    if (import.meta.env.SSR) {
      return;
    }

    const previous = previousPublishedContextRef.current;
    const shouldInvalidate = shouldInvalidateRouterOnAccessChange({
      previousAccessKey: accessKey(previous.access),
      access: context.access,
      isReady: context.isReady,
      routerContextReady: previous.isReady,
    });

    if (shouldInvalidate) {
      void router.invalidate();
    }

    previousPublishedContextRef.current = context;
  }, [context, router]);
};
