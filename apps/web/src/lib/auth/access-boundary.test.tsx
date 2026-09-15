import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { useAccessBoundary } from './access-boundary';
import {
  getClientBearerForTests,
  rememberClientBearer,
  resetClientBearerForTests,
} from './get-bearer-token';
import type { ReactNode } from 'react';

const authState = vi.hoisted(() => ({
  isLoaded: false as boolean,
  isSignedIn: false as boolean,
  userId: undefined as string | null | undefined,
  orgId: undefined as string | null | undefined,
  getToken: () => Promise.resolve(null as string | null),
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

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const seedPriorSessionCache = () => {
  queryClient.setQueryData(['transactions'], [{ id: 'txn_prior' }]);
  queryClient.setQueryData(['household-overview'], { name: 'Prior household' });
  queryClient.setQueryData(['accounts'], [{ id: 'acct_prior' }]);
};

describe('useAccessBoundary', () => {
  beforeEach(() => {
    queryClient.clear();
    resetClientBearerForTests();
    authState.isLoaded = false;
    authState.isSignedIn = false;
    authState.userId = undefined;
    authState.orgId = undefined;
    authState.getToken = () => Promise.resolve(null);
  });

  afterEach(() => {
    queryClient.clear();
    resetClientBearerForTests();
  });

  it('keeps the first loaded session cache and clears when the signed-in member signs out', () => {
    seedPriorSessionCache();
    const { rerender } = renderHook(() => useAccessBoundary(), { wrapper });

    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    authState.orgId = 'org_a';
    rerender();

    expect(queryClient.getQueryData(['transactions'])).toEqual([
      { id: 'txn_prior' },
    ]);

    authState.isSignedIn = false;
    authState.userId = null;
    authState.orgId = null;
    rerender();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('clears leftover cache when the active household changes', () => {
    const { rerender } = renderHook(() => useAccessBoundary(), { wrapper });

    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    authState.orgId = 'org_a';
    rerender();

    seedPriorSessionCache();
    authState.orgId = 'org_b';
    rerender();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('clears leftover cache before the new session children render', () => {
    const readsDuringRender: unknown[] = [];

    const SessionCacheBridge = () => {
      useAccessBoundary();
      return null;
    };

    const Child = () => {
      readsDuringRender.push(queryClient.getQueryData(['transactions']));
      return null;
    };

    const renderTree = () => (
      <QueryClientProvider client={queryClient}>
        <SessionCacheBridge />
        <Child />
      </QueryClientProvider>
    );

    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    authState.orgId = 'org_a';
    seedPriorSessionCache();
    const { rerender } = render(renderTree());

    expect(readsDuringRender.at(-1)).toEqual([{ id: 'txn_prior' }]);

    readsDuringRender.length = 0;
    authState.userId = 'user_b';
    rerender(renderTree());

    expect(readsDuringRender.length).toBeGreaterThan(0);
    expect(readsDuringRender[0]).toBeUndefined();
    expect(readsDuringRender.every((value) => value === undefined)).toBe(true);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
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

    authState.isSignedIn = true;
    authState.userId = 'user_a';
    authState.orgId = 'org_a';
    rerender();

    expect(queryClient.getQueryData(['transactions'])).toEqual([
      { id: 'txn_prior' },
    ]);
  });

  it('keeps the ensureAccess bearer while Clerk React is still catching up after login', async () => {
    authState.isLoaded = true;
    authState.isSignedIn = false;
    const { rerender } = renderHook(() => useAccessBoundary(), { wrapper });

    rememberClientBearer('session-jwt');
    rerender();

    await expect(getClientBearerForTests()).resolves.toBe('session-jwt');
  });

  it('uses the ensureAccess bearer when Clerk is signed in but getToken is still empty', async () => {
    rememberClientBearer('session-jwt');
    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    authState.orgId = 'org_a';
    renderHook(() => useAccessBoundary(), { wrapper });

    await expect(getClientBearerForTests()).resolves.toBe('session-jwt');
  });

  it('drops the remembered bearer when the signed-in member signs out', async () => {
    rememberClientBearer('session-jwt');
    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    authState.orgId = 'org_a';
    const { rerender } = renderHook(() => useAccessBoundary(), { wrapper });

    authState.isSignedIn = false;
    authState.userId = null;
    authState.orgId = null;
    rerender();

    await expect(getClientBearerForTests()).resolves.toBeNull();
  });
});
