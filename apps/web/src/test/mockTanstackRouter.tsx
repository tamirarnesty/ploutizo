import { vi } from 'vitest';
import type * as TanstackRouterModule from '@tanstack/react-router';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof TanstackRouterModule>();
  const { tanstackRouterMock, useRouterMock } =
    await import('./tanstackRouterMocks');
  return {
    ...actual,
    Link: tanstackRouterMock.Link,
    useNavigate: tanstackRouterMock.useNavigate,
    useSearch: tanstackRouterMock.useSearch,
    useRouterState: tanstackRouterMock.useRouterState,
    useBlocker: tanstackRouterMock.useBlocker,
    useRouteContext: tanstackRouterMock.useRouteContext,
    useMatches: tanstackRouterMock.useMatches,
    getRouteApi: tanstackRouterMock.getRouteApi,
    useRouter: useRouterMock,
  };
});

export {
  resetTanstackRouterMocks as resetRouterMocks,
  routerMocks,
  useRouterMock,
} from './tanstackRouterMocks';
