import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { useAccessGate } from './AccessGate';
import {
  getClientHouseholdBearer,
  rememberTransitionCredential,
  resetWorkingSetForTests,
} from './working-set';
import type { AccessState } from './access-state';
import type { ReactNode } from 'react';

const authState = vi.hoisted(() => ({
  isLoaded: false as boolean,
  isSignedIn: false as boolean,
  userId: undefined as string | null | undefined,
  orgId: undefined as string | null | undefined,
  getToken: (_options?: { skipCache?: boolean }) =>
    Promise.resolve(null as string | null),
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

const unsignedJwt = (payload: Record<string, unknown>) => {
  const body = btoa(JSON.stringify(payload))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return `hdr.${body}.sig`;
};

const householdAJwt = unsignedJwt({
  sub: 'user_a',
  org_id: 'org_a',
});

const seedPriorWorkingSet = () => {
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

describe('useAccessGate', () => {
  beforeEach(() => {
    queryClient.clear();
    resetWorkingSetForTests();
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
    resetWorkingSetForTests();
  });

  it('keeps the first loaded working set and discards it when the signed-in member signs out', () => {
    seedPriorWorkingSet();
    const { rerender } = renderHook(() => useAccessGate(), { wrapper });

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

  it('discards leftover cache and pauses work when the active household changes', () => {
    const { result, rerender } = renderHook(() => useAccessGate(), {
      wrapper,
    });

    signInAs(householdA);
    rerender();

    seedPriorWorkingSet();
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
    seedPriorWorkingSet();
    const { result, rerender } = renderHook(() => useAccessGate(), {
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

  it('ends the working set when the route snapshot lags the loaded provider', () => {
    const { result, rerender } = renderHook(() => useAccessGate(), {
      wrapper,
    });

    signInAs(householdA);
    rerender();
    seedPriorWorkingSet();

    routeAccess.current = householdB;
    rerender();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(invalidateRouter).toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it('ends the working set and invalidates when a loaded provider is signed-out against a signed-in route', () => {
    seedPriorWorkingSet();
    routeAccess.current = householdA;
    const { rerender } = renderHook(() => useAccessGate(), { wrapper });

    authState.isLoaded = true;
    authState.isSignedIn = false;
    rerender();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(invalidateRouter).toHaveBeenCalled();
  });

  it('uses the transition bearer when Clerk is signed in but getToken is still empty', async () => {
    rememberTransitionCredential(householdAJwt, householdA);
    signInAs(householdA);
    renderHook(() => useAccessGate(), { wrapper });

    await expect(getClientHouseholdBearer()).resolves.toBe(householdAJwt);
  });

  it('drops the remembered bearer when the signed-in member signs out', async () => {
    rememberTransitionCredential(householdAJwt, householdA);
    signInAs(householdA);
    const { rerender } = renderHook(() => useAccessGate(), { wrapper });

    authState.isSignedIn = false;
    authState.userId = null;
    authState.orgId = null;
    routeAccess.current = { status: 'signed-out' };
    rerender();

    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });

  it('asks Clerk for a token with skipCache', async () => {
    const getToken = vi.fn((_options?: { skipCache?: boolean }) =>
      Promise.resolve(null)
    );
    authState.getToken = getToken;
    signInAs(householdA);
    renderHook(() => useAccessGate(), { wrapper });

    await getClientHouseholdBearer();
    expect(getToken).toHaveBeenCalledWith({ skipCache: true });
  });
});
