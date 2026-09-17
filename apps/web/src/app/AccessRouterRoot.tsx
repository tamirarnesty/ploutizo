import { RouterProvider } from '@tanstack/react-router';
import { useSyncExternalStore } from 'react';
import {
  getAccessRouterContext,
  getAccessRouterContextServerSnapshot,
  subscribeAccessRouterContext,
} from '@/lib/access/access-router-context-store';
import type { AnyRouter } from '@tanstack/react-router';

type AccessRouterRootProps = {
  router: AnyRouter;
};

export const AccessRouterRoot = ({ router }: AccessRouterRootProps) => {
  const context = useSyncExternalStore(
    subscribeAccessRouterContext,
    getAccessRouterContext,
    getAccessRouterContextServerSnapshot
  );

  return <RouterProvider router={router} context={context} />;
};
