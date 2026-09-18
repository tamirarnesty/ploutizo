import { dehydrate, hydrate } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { createWorkingSet } from './lib/access/create-working-set';
import { getActiveQueryClient } from './lib/access/working-set-registry';
import { routeTree } from './routeTree.gen';
import type { AccessState } from './lib/access/access-state';
import type { QueryClient } from '@tanstack/react-query';
import type { ImportReviewLocationState } from './lib/data-access/imports/importReviewLocationState';
import type { AccountCreateLocationState } from './lib/navigation/account-create-route';

export interface RouterContext {
  queryClient: QueryClient;
  access: AccessState;
  identityLoaded: boolean;
  isReady: boolean;
}

const signedOutAccess: AccessState = { status: 'signed-out' };

export const getRouter = () => {
  const client = import.meta.env.SSR
    ? createWorkingSet().queryClient
    : getActiveQueryClient();

  const router = createTanStackRouter({
    routeTree,
    context: {
      queryClient: client,
      access: signedOutAccess,
      identityLoaded: false,
      isReady: false,
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
    createAccount?: AccountCreateLocationState;
  }
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
