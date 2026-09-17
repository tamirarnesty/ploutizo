import { render } from '@testing-library/react';
import {
  Outlet,
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { AccessRouterRoot } from '@/app/AccessRouterRoot';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import type { RouterContext } from '@/router';
import type { RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

const signedOutAccess = { status: 'signed-out' as const };

export const createAccessTestRouteTree = (options: {
  shell: (props: { children: ReactNode }) => ReactNode;
  indexTestId?: string;
}) => {
  const indexTestId = options.indexTestId ?? 'index-page';
  const rootRoute = createRootRouteWithContext<RouterContext>()({
    component: () => <>{options.shell({ children: <Outlet /> })}</>,
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div data-testid={indexTestId}>Index</div>,
  });

  return rootRoute.addChildren([indexRoute]);
};

export const createAccessTestRouter = (options?: {
  context?: Partial<RouterContext>;
  shell?: (props: { children: ReactNode }) => ReactNode;
  initialLocation?: string;
  indexTestId?: string;
}) => {
  const routeTree = createAccessTestRouteTree({
    shell: options?.shell ?? (({ children }) => children),
    indexTestId: options?.indexTestId,
  });

  const queryClient = options?.context?.queryClient ?? getActiveQueryClient();

  return createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [options?.initialLocation ?? '/'],
    }),
    context: {
      queryClient,
      access: signedOutAccess,
      identityLoaded: false,
      isReady: false,
      ...options?.context,
    },
  });
};

type RenderWithAccessRouterOptions = Omit<RenderOptions, 'wrapper'> & {
  router?: ReturnType<typeof createAccessTestRouter>;
  initialLocation?: string;
  shell?: (props: { children: ReactNode }) => ReactNode;
  context?: Partial<RouterContext>;
  indexTestId?: string;
};

export const renderWithAccessRouter = async (
  ui: ReactElement | null = null,
  {
    router,
    initialLocation = '/',
    shell,
    context,
    indexTestId,
    ...renderOptions
  }: RenderWithAccessRouterOptions = {}
) => {
  const resolvedRouter =
    router ??
    createAccessTestRouter({
      shell,
      context,
      initialLocation,
      indexTestId,
    });

  await resolvedRouter.load();

  const view = render(
    <>
      {ui}
      <AccessRouterRoot router={resolvedRouter} />
    </>,
    renderOptions
  );

  return { ...view, router: resolvedRouter };
};
