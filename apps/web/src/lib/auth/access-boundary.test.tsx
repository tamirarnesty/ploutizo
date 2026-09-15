import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { useAccessBoundary } from './access-boundary';
import {
  getClientBearerForTests,
  rememberTransitionCredential,
  resetClientBearerForTests,
} from './get-bearer-token';
import type { AccessState } from './access-policy';
import type { ReactNode } from 'react';

const authState = vi.hoisted(() => ({
  isLoaded: false as boolean,
  isSignedIn: false as boolean,
  userId: undefined as string | null | undefined,
  orgId: undefined as string | null | undefined,
  getToken: () => Promise.resolve(null as string | null),
}));

const routeAccess = vi.hoisted(() => ({
  current: undefined as AccessState | undefined,
}));

const invalidateRouter = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@clerk/tanstack-react-start', () => ({
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
    userId: authState.userId,
    orgId: authState.orgId,
    getToken: authState.getToken,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: invalidateRouter }),
  useRouteContext: () => ({ access: routeAccess.current }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const householdA: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_a',
  activeHouseholdId: 'org_a',
};

const householdB: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_a',
  activeHouseholdId: 'org_b',
};

const seedPriorSessionCache = () => {
  queryClient.setQueryData(['transactions'], [{ id: 'txn_prior' }]);
  queryClient.setQueryData(['household-overview'], { name: 'Prior household' });
  queryClient.setQueryData(['accounts'], [{ id: 'acct_prior' }]);
};

const signInAs = (
  access: AccessState & { status: 'signed-in-with-active-household' }
) => {
  authState.isLoaded = true;
  authState.isSignedIn = true;
  authState.userId = access.signedInMemberId;
  authState.orgId = access.activeHouseholdId;
  routeAccess.current = access;
};

describe('useAccessBoundary', () => {
  beforeEach(() => {
    queryClient.clear();
    resetClientBearerForTests();
    invalidateRouter.mockClear();
    authState.isLoaded = false;
    authState.isSignedIn = false;
    authState.userId = undefined;
    authState.orgId = undefined;
    authState.getToken = () => Promise.resolve(null);
    routeAccess.current = undefined;
  });

  afterEach(() => {
    queryClient.clear();
    resetClientBearerForTests();
  });

  it('keeps the first loaded session cache and clears when the signed-in member signs out', () => {
    seedPriorSessionCache();
    const { rerender } = renderHook(() => useAccessBoundary(), { wrapper });

    signInAs(householdA);
    rerender();

    expect(queryClient.getQueryData(['transactions'])).toEqual([
      { id: 'txn_prior' },
    ]);

    authState.isSignedIn = false;
    authState.userId = null;
    authState.orgId = null;
    routeAccess.current = { status: 'signed-out' };
    rerender();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(invalidateRouter).toHaveBeenCalled();
  });

  it('clears leftover cache and pauses work when the active household changes', () => {
    const { result, rerender } = renderHook(() => useAccessBoundary(), {
      wrapper,
    });

    signInAs(householdA);
    rerender();

    seedPriorSessionCache();
    authState.orgId = 'org_b';
    rerender();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(invalidateRouter).toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it('does not resume children against a stale route snapshot after an active-household switch', () => {
    const readsDuringRender: unknown[] = [];

    const Child = () => {
      readsDuringRender.push(queryClient.getQueryData(['transactions']));
      return null;
    };

    const renderTree = (resume: boolean) => (
      <QueryClientProvider client={queryClient}>
        {resume ? <Child /> : null}
      </QueryClientProvider>
    );

    signInAs(householdA);
    seedPriorSessionCache();
    const { result, rerender } = renderHook(() => useAccessBoundary(), {
      wrapper,
    });
    render(renderTree(result.current));

    readsDuringRender.length = 0;
    authState.orgId = 'org_b';
    rerender();

    expect(result.current).toBe(false);
    render(renderTree(result.current));
    expect(readsDuringRender).toHaveLength(0);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);

    routeAccess.current = householdB;
    rerender();
    expect(result.current).toBe(true);
  });

  it('keeps the loaded session cache when Clerk catches up from signed-out to signed-in', () => {
    seedPriorSessionCache();
    const { rerender } = renderHook(() => useAccessBoundary(), { wrapper });

    authState.isLoaded = true;
    authState.isSignedIn = false;
    rerender();

    expect(queryClient.getQueryData(['transactions'])).toEqual([
      { id: 'txn_prior' },
    ]);

    signInAs(householdA);
    rerender();

    expect(queryClient.getQueryData(['transactions'])).toEqual([
      { id: 'txn_prior' },
    ]);
  });

  it('keeps the transition bearer while Clerk React is still catching up after login', async () => {
    authState.isLoaded = true;
    authState.isSignedIn = false;
    const { rerender } = renderHook(() => useAccessBoundary(), { wrapper });

    rememberTransitionCredential('session-jwt', householdA);
    rerender();

    await expect(getClientBearerForTests()).resolves.toBe('session-jwt');
  });

  it('uses the transition bearer when Clerk is signed in but getToken is still empty', async () => {
    rememberTransitionCredential('session-jwt', householdA);
    signInAs(householdA);
    renderHook(() => useAccessBoundary(), { wrapper });

    await expect(getClientBearerForTests()).resolves.toBe('session-jwt');
  });

  it('drops the remembered bearer when the signed-in member signs out', async () => {
    rememberTransitionCredential('session-jwt', householdA);
    signInAs(householdA);
    const { rerender } = renderHook(() => useAccessBoundary(), { wrapper });

    authState.isSignedIn = false;
    authState.userId = null;
    authState.orgId = null;
    routeAccess.current = { status: 'signed-out' };
    rerender();

    await expect(getClientBearerForTests()).resolves.toBeNull();
  });
});
