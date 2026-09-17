import './working-set-cleanup';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveQueryClient,
  resetWorkingSetRegistryForTests,
} from './working-set-registry';
import { AccessProvider, useAccess } from './AccessProvider';
import {
  getClientHouseholdBearer,
  resetBearerStateForTests,
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

vi.mock('@clerk/tanstack-react-start', () => ({
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
    userId: authState.userId,
    orgId: authState.orgId,
    getToken: authState.getToken,
  }),
}));

const householdA: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_a',
  activeHouseholdId: 'org_a',
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

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getActiveQueryClient()}>
    <AccessProvider>{children}</AccessProvider>
  </QueryClientProvider>
);

const signInAs = (
  access: AccessState & { status: 'signed-in-with-active-household' },
  token: string | null = householdAJwt
) => {
  authState.isLoaded = true;
  authState.isSignedIn = true;
  authState.userId = access.signedInMemberId;
  authState.orgId = access.activeHouseholdId;
  authState.getToken = (_options?: { skipCache?: boolean }) =>
    Promise.resolve(token);
};

/** Bearer token edge cases — Clerk auth is stubbed; provider wiring is covered in access-shell.integration.test.tsx. */
describe('AccessProvider bearer validation', () => {
  beforeEach(() => {
    resetWorkingSetRegistryForTests();
    resetBearerStateForTests();
    authState.isLoaded = false;
    authState.isSignedIn = false;
    authState.userId = undefined;
    authState.orgId = undefined;
    authState.getToken = () => Promise.resolve(null);
  });

  afterEach(() => {
    resetWorkingSetRegistryForTests();
    resetBearerStateForTests();
  });

  it('stays not ready while Clerk is still loading', () => {
    const { result } = renderHook(() => useAccess(), { wrapper });
    expect(result.current.isReady).toBe(false);
    expect(result.current.identityLoaded).toBe(false);
  });

  it('becomes ready for a signed-out visitor after Clerk loads', async () => {
    const { result, rerender } = renderHook(() => useAccess(), { wrapper });

    authState.isLoaded = true;
    rerender();

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    expect(result.current.access).toEqual({ status: 'signed-out' });
    expect(result.current.identityLoaded).toBe(true);
    expect(result.current.queryClient).toBe(getActiveQueryClient());
  });

  it('waits for a matching household token before becoming ready', async () => {
    const { result, rerender } = renderHook(() => useAccess(), { wrapper });

    signInAs(householdA, null);
    rerender();
    expect(result.current.isReady).toBe(false);

    let cacheWarmed = false;
    authState.getToken = (options?: { skipCache?: boolean }) => {
      if (options?.skipCache) {
        cacheWarmed = true;
        return Promise.resolve(householdAJwt);
      }
      return Promise.resolve(cacheWarmed ? householdAJwt : null);
    };
    rerender();

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    await expect(getClientHouseholdBearer()).resolves.toBe(householdAJwt);
  });

  it('requests a fresh token on identity transition', async () => {
    const getToken = vi.fn((options?: { skipCache?: boolean }) =>
      Promise.resolve(
        options?.skipCache
          ? householdAJwt
          : unsignedJwt({ sub: 'user_a', org_id: 'org_old' })
      )
    );
    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = householdA.signedInMemberId;
    authState.orgId = householdA.activeHouseholdId;
    authState.getToken = getToken;

    const { result } = renderHook(() => useAccess(), { wrapper });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    expect(getToken).toHaveBeenCalledWith({ skipCache: true });
  });

  it('surfaces bearerError when Clerk never returns a matching token', async () => {
    signInAs(householdA, null);
    const { result, rerender } = renderHook(() => useAccess(), { wrapper });

    expect(result.current.isReady).toBe(false);

    await waitFor(() => {
      expect(result.current.bearerError).toBe(true);
    });

    authState.getToken = (options?: { skipCache?: boolean }) =>
      Promise.resolve(options?.skipCache ? householdAJwt : null);
    result.current.retryBearer();
    rerender();

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
      expect(result.current.bearerError).toBe(false);
    });
  });

  it('surfaces bearerError when fresh token retrieval rejects', async () => {
    signInAs(householdA, householdAJwt);
    authState.getToken = (options?: { skipCache?: boolean }) =>
      options?.skipCache
        ? Promise.reject(new Error('network failure'))
        : Promise.resolve(householdAJwt);

    const { result } = renderHook(() => useAccess(), { wrapper });

    await waitFor(() => {
      expect(result.current.bearerError).toBe(true);
      expect(result.current.isReady).toBe(false);
    });
  });
});
