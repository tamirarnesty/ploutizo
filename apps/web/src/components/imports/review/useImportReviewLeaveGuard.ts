import { useEffect } from 'react';
import { useBlocker } from '@tanstack/react-router';

interface ImportReviewLeaveGuardOptions {
  hasUnsavedWork: boolean;
  flush: () => Promise<boolean>;
}

/**
 * Soft-leave + tab close/refresh guard for review-session autosave (ADR 0005).
 * Flushes pending paced work on in-app navigation; blocks when Failed remains.
 * Tab close/refresh: best-effort flush + browser warn when pending or failed.
 */
export const useImportReviewLeaveGuard = ({
  hasUnsavedWork,
  flush,
}: ImportReviewLeaveGuardOptions) => {
  useBlocker({
    shouldBlockFn: async () => {
      if (!hasUnsavedWork) return false;
      const ok = await flush();
      return !ok;
    },
    enableBeforeUnload: hasUnsavedWork,
  });

  useEffect(() => {
    const bestEffortFlush = () => {
      if (!hasUnsavedWork) return;
      void flush();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        bestEffortFlush();
      }
    };

    window.addEventListener('beforeunload', bestEffortFlush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', bestEffortFlush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [flush, hasUnsavedWork]);
};
