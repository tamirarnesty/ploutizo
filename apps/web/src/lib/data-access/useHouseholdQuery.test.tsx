import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { householdJwt } from '@/test/jwt-fixture';
import { AccessProvider } from '@/lib/access/AccessProvider';
import {
  getActiveQueryClient,
  resetWorkingSetRegistryForTests,
} from '@/lib/access/working-set-registry';
import { resetBearerStateForTests } from '@/lib/access/working-set';
import { useHouseholdQuery } from './useHouseholdQuery';
import type { ReactNode } from 'react';

vi.hoisted(() => {
  vi.unmock('@/lib/data-access/useHouseholdQuery');
});

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

const householdAJwt = householdJwt('user_a', 'org_a');

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getActiveQueryClient()}>
    <AccessProvider>{children}</AccessProvider>
  </QueryClientProvider>
);

describe('useHouseholdQuery', () => {
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

  it('does not fetch until household bearer is ready', async () => {
    const queryFn = vi.fn(async () => ({ accounts: [] }));

    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    authState.orgId = 'org_a';
    authState.getToken = (options?: { skipCache?: boolean }) =>
      Promise.resolve(options?.skipCache ? householdAJwt : null);

    const { result, rerender } = renderHook(
      () =>
        useHouseholdQuery({
          queryKey: ['accounts'],
          queryFn,
        }),
      { wrapper }
    );

    rerender();
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
