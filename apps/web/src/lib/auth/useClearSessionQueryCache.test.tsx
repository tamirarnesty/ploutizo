import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { useClearSessionQueryCache } from './useClearSessionQueryCache';
import type { ReactNode } from 'react';

const authState = vi.hoisted(() => ({
  isLoaded: false as boolean,
  userId: undefined as string | null | undefined,
}));

vi.mock('@clerk/tanstack-react-start', () => ({
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    userId: authState.userId,
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

describe('useClearSessionQueryCache', () => {
  beforeEach(() => {
    queryClient.clear();
    authState.isLoaded = false;
    authState.userId = undefined;
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('keeps the first loaded session cache and clears when the user signs out', () => {
    seedPriorSessionCache();
    const { rerender } = renderHook(() => useClearSessionQueryCache(), {
      wrapper,
    });

    authState.isLoaded = true;
    authState.userId = 'user_a';
    rerender();

    expect(queryClient.getQueryData(['transactions'])).toEqual([
      { id: 'txn_prior' },
    ]);

    authState.userId = null;
    rerender();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(queryClient.getQueryData(['household-overview'])).toBeUndefined();
    expect(queryClient.getQueryData(['accounts'])).toBeUndefined();
  });

  it('clears leftover cache when a different account signs in', () => {
    const { rerender } = renderHook(() => useClearSessionQueryCache(), {
      wrapper,
    });

    authState.isLoaded = true;
    authState.userId = null;
    rerender();

    seedPriorSessionCache();
    authState.userId = 'user_b';
    rerender();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('clears leftover cache before the new session children render', () => {
    const readsDuringRender: unknown[] = [];

    const SessionCacheBridge = () => {
      useClearSessionQueryCache();
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
    authState.userId = 'user_a';
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
});
