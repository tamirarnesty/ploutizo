import { vi } from 'vitest';
import type { ReactNode } from 'react';

type RouterLocationState = {
  importReview?: unknown;
  createAccount?: unknown;
};

const resolveLinkHref = (
  to: string,
  params?: { draftId?: string },
  search?: Record<string, string>
) => {
  let href = params?.draftId ? to.replace('$draftId', params.draftId) : to;
  if (search) {
    href = `${href}?${new URLSearchParams(search).toString()}`;
  }
  return href;
};

const { routerMocks, tanstackRouterMock, useRouterMock } = vi.hoisted(() => {
  const mocks = {
    pathname: '/',
    navigate: vi.fn(),
    locationState: {} as RouterLocationState,
    shouldBlockFn: undefined as
      | ((args: {
          current: { pathname: string };
          next: { pathname: string };
        }) => boolean | Promise<boolean>)
      | undefined,
    useBlocker: vi.fn(),
  };

  const mockModule = {
    Link: ({
      children,
      to,
      onClick,
      params,
      search,
      state,
      preload,
    }: {
      children: ReactNode;
      to: string;
      onClick?: () => void;
      params?: { draftId?: string };
      search?: Record<string, string>;
      state?: unknown;
      preload?: false | 'intent' | 'viewport' | 'render';
    }) => (
      <a
        href={resolveLinkHref(to, params, search)}
        data-router-state={
          state === undefined ? undefined : JSON.stringify(state)
        }
        data-preload={preload === false ? undefined : preload}
        onClick={onClick}
      >
        {children}
      </a>
    ),
    useNavigate: () => mocks.navigate,
    useRouterState: (options?: {
      select?: (state: {
        location: { pathname: string; state: RouterLocationState };
      }) => unknown;
    }) => {
      const state = {
        location: {
          pathname: mocks.pathname,
          state: mocks.locationState,
        },
      };
      return options?.select ? options.select(state) : state;
    },
    useBlocker: (args: {
      shouldBlockFn?: (args: {
        current: { pathname: string };
        next: { pathname: string };
      }) => boolean | Promise<boolean>;
      enableBeforeUnload?: boolean;
    }) => {
      mocks.shouldBlockFn = args.shouldBlockFn;
      return mocks.useBlocker(args);
    },
    useRouteContext: () => ({}),
    useRouter: vi.fn(),
    getRouteApi: () => ({
      useRouteContext: () => ({}),
    }),
  };

  return {
    routerMocks: mocks,
    tanstackRouterMock: mockModule,
    useRouterMock: mockModule.useRouter,
  };
});

export { routerMocks, useRouterMock };

export const resetRouterMocks = () => {
  routerMocks.pathname = '/';
  routerMocks.navigate.mockReset();
  routerMocks.locationState = {};
  routerMocks.shouldBlockFn = undefined;
  routerMocks.useBlocker.mockReset();
  useRouterMock.mockReset();
};

vi.mock('@tanstack/react-router', () => tanstackRouterMock);
