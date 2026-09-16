import { dehydrate, hydrate } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { createQueryClient, queryClient } from './lib/queryClient';
import { routeTree } from './routeTree.gen';
import type { QueryClient } from '@tanstack/react-query';
import type { AccessState } from './lib/access';
import type { ImportReviewLocationState } from './lib/data-access/imports/importReviewLocationState';

export interface RouterContext {
  queryClient: QueryClient;
  access: AccessState;
}

export const getRouter = () => {
  const client = import.meta.env.SSR
    ? createQueryClient().queryClient
    : queryClient;

  const router = createTanStackRouter({
    routeTree,
    context: {
      queryClient: client,
      access: { status: 'signed-out' },
    },
    // Query DehydratedState uses `unknown` keys; Router requires JSON-serializable types.
    dehydrate: () =>
      ({
        queryClientState: dehydrate(client, {
          shouldDehydrateMutation: () => false,
        }),
      }) as never,
    hydrate: (dehydrated) => {
      hydrate(
        client,
        (dehydrated as { queryClientState: Parameters<typeof hydrate>[1] })
          .queryClientState
      );
    },
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Let TanStack Query own freshness; don't let the router cache loader
    // results across preloads independently of Query staleTime.
    defaultPreloadStaleTime: 0,
  });

  return router;
};

declare module '@tanstack/history' {
  interface HistoryState {
    importReview?: ImportReviewLocationState;
  }
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
