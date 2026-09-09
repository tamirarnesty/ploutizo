import { vi } from 'vitest';
import type { ReactNode } from 'react';

type RouterLocationState = {
  importReview?: unknown;
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

const { routerMocks, tanstackRouterMock } = vi.hoisted(() => {
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
    }: {
      children: ReactNode;
      to: string;
      onClick?: () => void;
      params?: { draftId?: string };
      search?: Record<string, string>;
    }) => (
      <a href={resolveLinkHref(to, params, search)} onClick={onClick}>
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
  };

  return { routerMocks: mocks, tanstackRouterMock: mockModule };
});

export { routerMocks };

export const resetRouterMocks = () => {
  routerMocks.pathname = '/';
  routerMocks.navigate.mockReset();
  routerMocks.locationState = {};
  routerMocks.shouldBlockFn = undefined;
  routerMocks.useBlocker.mockReset();
};

vi.mock('@tanstack/react-router', () => tanstackRouterMock);
