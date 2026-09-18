import '@/lib/access/working-set-cleanup';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginWorkingSetScope,
  getActiveQueryClient,
  isStaleWorkingSetError,
  replaceActiveWorkingSet,
  resetWorkingSetRegistryForTests,
} from '@/lib/access/working-set-registry';
import { HouseholdHookWrapper } from '@/test/household-hook-harness';

import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import type { HouseholdMutationFunctionContext } from '@/lib/data-access/useHouseholdQuery';

vi.mock('@/lib/access/AccessProvider', async () => {
  const { householdAccessProviderMock } =
    await import('@/test/householdAccessMock');
  return householdAccessProviderMock;
});

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe('useHouseholdMutation working-set scope', () => {
  afterEach(() => {
    resetWorkingSetRegistryForTests();
  });

  it('runs mutationFn while the captured working set stays current', async () => {
    const mutationFn = vi.fn(async () => 'ok');

    const { result } = renderHook(
      () =>
        useHouseholdMutation({
          mutationFn,
        }),
      { wrapper: HouseholdHookWrapper }
    );

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mutationFn).toHaveBeenCalledTimes(1);
  });

  it('does not run mutationFn after a household switch during async onMutate', async () => {
    const mutationFn = vi.fn(async () => 'ok');
    const pendingOnMutate = deferred();

    const { result } = renderHook(
      () =>
        useHouseholdMutation({
          onMutate: async () => {
            await pendingOnMutate.promise;
          },
          mutationFn,
        }),
      { wrapper: HouseholdHookWrapper }
    );

    let mutationPromise: Promise<string> | undefined;
    act(() => {
      mutationPromise = result.current.mutateAsync();
    });

    replaceActiveWorkingSet();
    pendingOnMutate.resolve();

    await act(async () => {
      await expect(mutationPromise).rejects.toSatisfy(isStaleWorkingSetError);
    });

    expect(mutationFn).not.toHaveBeenCalled();
  });

  it('does not run mutationFn after a household switch before mutationFn runs', async () => {
    const mutationFn = vi.fn(async () => 'ok');
    const pendingOnMutate = deferred();

    const { result } = renderHook(
      () =>
        useHouseholdMutation({
          onMutate: async () => {
            await pendingOnMutate.promise;
          },
          mutationFn,
        }),
      { wrapper: HouseholdHookWrapper }
    );

    let mutationPromise: Promise<string> | undefined;
    act(() => {
      mutationPromise = result.current.mutateAsync();
    });
    replaceActiveWorkingSet();
    pendingOnMutate.resolve();

    await act(async () => {
      await expect(mutationPromise).rejects.toSatisfy(isStaleWorkingSetError);
    });
    expect(mutationFn).not.toHaveBeenCalled();
  });

  it('does not run post-await onMutate work after a household switch', async () => {
    const mutationFn = vi.fn(async () => 'ok');
    const pendingOnMutate = deferred();
    const applyOptimistic = vi.fn();

    const { result } = renderHook(
      () =>
        useHouseholdMutation({
          onMutate: async (
            _variables,
            context: HouseholdMutationFunctionContext
          ) => {
            await pendingOnMutate.promise;
            context.checkpointWorkingSet();
            applyOptimistic();
          },
          mutationFn,
        }),
      { wrapper: HouseholdHookWrapper }
    );

    let mutationPromise: Promise<string> | undefined;
    act(() => {
      mutationPromise = result.current.mutateAsync();
    });
    replaceActiveWorkingSet();
    pendingOnMutate.resolve();

    await act(async () => {
      await expect(mutationPromise).rejects.toSatisfy(isStaleWorkingSetError);
    });
    expect(applyOptimistic).not.toHaveBeenCalled();
    expect(mutationFn).not.toHaveBeenCalled();
  });

  it('does not apply optimistic cache updates after a household switch during onMutate', async () => {
    const queryKey = ['accounts'] as const;
    const pendingOnMutate = deferred();
    const priorClient = getActiveQueryClient();
    priorClient.setQueryData(queryKey, [{ id: 'acct_1' }]);

    const { result } = renderHook(
      () =>
        useHouseholdMutation({
          onMutate: async (
            _variables,
            context: HouseholdMutationFunctionContext
          ) => {
            await pendingOnMutate.promise;
            context.checkpointWorkingSet();
            getActiveQueryClient().setQueryData(queryKey, [{ id: 'acct_new' }]);
          },
          mutationFn: async () => 'ok',
        }),
      { wrapper: HouseholdHookWrapper }
    );

    let mutationPromise: Promise<string> | undefined;
    act(() => {
      mutationPromise = result.current.mutateAsync();
    });
    replaceActiveWorkingSet();
    pendingOnMutate.resolve();

    await act(async () => {
      await expect(mutationPromise).rejects.toSatisfy(isStaleWorkingSetError);
    });
    expect(getActiveQueryClient().getQueryData(queryKey)).toBeUndefined();
  });

  it('marks captured scopes stale after a household switch', () => {
    const scope = beginWorkingSetScope();
    replaceActiveWorkingSet();
    expect(scope.isCurrent()).toBe(false);
  });
});
