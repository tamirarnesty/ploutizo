import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { AccessRouterBridge } from './access-router-bridge';
import { AccessProvider, useAccess } from './AccessProvider';
import {
  getActiveQueryClient,
  resetWorkingSetRegistryForTests,
} from './working-set-registry';
import { resetBearerStateForTests } from './working-set';
import type { ReactNode } from 'react';

const unsignedJwt = (payload: Record<string, unknown>) => {
  const body = btoa(JSON.stringify(payload))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return `hdr.${body}.sig`;
};

const householdAJwt = unsignedJwt({ sub: 'user_a', org_id: 'org_a' });
const householdBJwt = unsignedJwt({ sub: 'user_a', org_id: 'org_b' });

const authState = vi.hoisted(() => ({
  isLoaded: true as boolean,
  isSignedIn: true as boolean,
  userId: 'user_a' as string | null | undefined,
  orgId: 'org_a' as string | null | undefined,
  getToken: (_options?: { skipCache?: boolean }) =>
    Promise.resolve('token' as string | null),
}));

const routerUpdate = vi.fn();
const routerInvalidate = vi.fn();
const routerContext = vi.hoisted(() => ({
  queryClient: null as ReturnType<typeof getActiveQueryClient> | null,
  access: { status: 'signed-out' as const },
  isReady: false,
}));

vi.mock('@clerk/tanstack-react-start', () => ({
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
    userId: authState.userId,
    orgId: authState.orgId,
    getToken: authState.getToken,
  }),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useRouter: () => {
      if (!routerContext.queryClient) {
        routerContext.queryClient = getActiveQueryClient();
      }
      return {
        options: {
          context: routerContext,
        },
        update: (options: { context: typeof routerContext }) => {
          Object.assign(routerContext, options.context);
          routerUpdate(options);
        },
        invalidate: routerInvalidate,
      };
    },
  };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getActiveQueryClient()}>
    <AccessProvider>
      <AccessRouterBridge />
      {children}
    </AccessProvider>
  </QueryClientProvider>
);

describe('AccessRouterBridge', () => {
  beforeEach(() => {
    resetWorkingSetRegistryForTests();
    resetBearerStateForTests();
    routerUpdate.mockClear();
    routerInvalidate.mockClear();
    routerContext.queryClient = getActiveQueryClient();
    routerContext.access = { status: 'signed-out' };
    routerContext.isReady = false;
    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    authState.orgId = 'org_a';
    authState.getToken = (options?: { skipCache?: boolean }) =>
      Promise.resolve(options?.skipCache ? householdAJwt : null);
  });

  afterEach(() => {
    resetWorkingSetRegistryForTests();
    resetBearerStateForTests();
  });

  it('publishes live access into router context', () => {
    renderHook(() => useAccess(), { wrapper });

    expect(routerUpdate).toHaveBeenCalled();
    const lastCall = routerUpdate.mock.calls.at(-1)?.[0];
    expect(lastCall.context.access).toEqual({
      status: 'signed-in-with-active-household',
      signedInMemberId: 'user_a',
      activeHouseholdId: 'org_a',
    });
  });

  it('replaces the working set and invalidates the router on household switch', () => {
    getActiveQueryClient().setQueryData(['accounts'], [{ id: 'acct_prior' }]);
    const priorClient = getActiveQueryClient();

    const { rerender } = renderHook(() => useAccess(), { wrapper });

    authState.orgId = 'org_b';
    authState.getToken = (options?: { skipCache?: boolean }) =>
      Promise.resolve(options?.skipCache ? householdBJwt : householdAJwt);
    rerender();

    expect(routerInvalidate).toHaveBeenCalled();
    expect(priorClient.getQueryCache().getAll()).toHaveLength(0);
    expect(getActiveQueryClient()).not.toBe(priorClient);
  });

  it('invalidates the router when signed-out access becomes ready', async () => {
    authState.isSignedIn = false;
    authState.userId = null;
    authState.orgId = null;

    renderHook(() => useAccess(), { wrapper });

    await waitFor(() => {
      expect(routerInvalidate).toHaveBeenCalled();
    });
  });

  it('does not invalidate when the household bearer becomes ready', async () => {
    const { result } = renderHook(() => useAccess(), { wrapper });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(routerInvalidate).not.toHaveBeenCalled();
  });
});
