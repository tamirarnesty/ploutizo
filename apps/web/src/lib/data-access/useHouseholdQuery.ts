import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useAccess } from '@/lib/access/AccessProvider';
import { isHouseholdBearerReady } from '@/lib/access/household-loader-ready';
import {
  beginWorkingSetScope,
  createStaleWorkingSetError,
} from '@/lib/access/working-set-registry';
import type { WorkingSetScope } from '@/lib/access/working-set-registry';
import { createHouseholdBearerUnavailableError } from '@/lib/queryClient';
import {
  isHouseholdQueryBearerReady,
  whileHouseholdBearerPending,
} from './household-query-enabled';
import type {
  InfiniteData,
  MutateOptions,
  MutationFunctionContext,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';

export type HouseholdMutationFunctionContext = MutationFunctionContext & {
  checkpointWorkingSet: () => void;
};

export type HouseholdMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'onMutate'
> & {
  onMutate?: (
    variables: TVariables,
    context: HouseholdMutationFunctionContext
  ) => Promise<TContext | void> | TContext | void;
};

const peekMutationScope = (stack: WorkingSetScope[]) => stack[stack.length - 1];

const takeMutationScope = (stack: WorkingSetScope[]) => stack.pop();

const assertScopeCurrent = (scope: WorkingSetScope | undefined) => {
  if (!scope?.isCurrent()) {
    throw createStaleWorkingSetError();
  }
};

const discardMutationScopeIfCurrent = (
  stack: WorkingSetScope[],
  scope: WorkingSetScope | undefined
) => {
  if (scope && peekMutationScope(stack) === scope) {
    takeMutationScope(stack);
  }
};

const wrapMutationContext = (
  scope: WorkingSetScope | undefined,
  mutationContext: MutationFunctionContext
): HouseholdMutationFunctionContext => ({
  ...mutationContext,
  checkpointWorkingSet: () => {
    assertScopeCurrent(scope);
  },
});

export const useHouseholdQuery = <
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[],
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> => {
  const { isReady, access } = useAccess();
  const householdReady = isHouseholdQueryBearerReady(isReady, access);
  const result = useQuery({
    ...options,
    enabled: householdReady && (options.enabled ?? true),
  });

  if (householdReady) {
    return result;
  }

  return whileHouseholdBearerPending(result);
};

export const useHouseholdInfiniteQuery = <
  TQueryFnData,
  TError = Error,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends readonly unknown[] = readonly unknown[],
  TPageParam = unknown,
>(
  options: UseInfiniteQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >
): UseInfiniteQueryResult<TData, TError> => {
  const { isReady, access } = useAccess();
  const householdReady = isHouseholdQueryBearerReady(isReady, access);
  const result = useInfiniteQuery({
    ...options,
    enabled: householdReady && (options.enabled ?? true),
  });

  if (householdReady) {
    return result;
  }

  return whileHouseholdBearerPending(result);
};

export const useHouseholdMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: HouseholdMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> => {
  const { isReady, access } = useAccess();
  const householdReady = isHouseholdBearerReady(isReady, access);
  const { mutationFn, onMutate, ...rest } = options;
  const scopeStack = useRef<WorkingSetScope[]>([]);

  const captureWorkingSetScope = useCallback(() => {
    scopeStack.current.push(beginWorkingSetScope());
  }, []);

  const mutation = useMutation({
    ...rest,
    onMutate: async (variables, mutationContext) => {
      const scope = peekMutationScope(scopeStack.current);

      try {
        assertScopeCurrent(scope);
        if (!onMutate) {
          return undefined as TContext;
        }

        const userContext = await onMutate(
          variables,
          wrapMutationContext(scope, mutationContext)
        );
        assertScopeCurrent(scope);
        return userContext as TContext;
      } catch (error) {
        discardMutationScopeIfCurrent(scopeStack.current, scope);
        throw error;
      }
    },
    mutationFn: (variables, mutateContext) => {
      if (!householdReady) {
        throw createHouseholdBearerUnavailableError();
      }
      if (!mutationFn) {
        const error = new Error('mutationFn is required');
        error.name = 'MissingMutationFnError';
        throw error;
      }

      const scope = takeMutationScope(scopeStack.current);
      assertScopeCurrent(scope);

      return mutationFn(variables, mutateContext);
    },
  });

  const mutate = useCallback(
    (
      variables: TVariables,
      mutateOptions?: MutateOptions<TData, TError, TVariables, TContext>
    ) => {
      captureWorkingSetScope();
      return mutation.mutate(variables, mutateOptions);
    },
    [captureWorkingSetScope, mutation.mutate]
  );

  const mutateAsync = useCallback(
    (
      variables: TVariables,
      mutateOptions?: MutateOptions<TData, TError, TVariables, TContext>
    ) => {
      captureWorkingSetScope();
      return mutation.mutateAsync(variables, mutateOptions);
    },
    [captureWorkingSetScope, mutation.mutateAsync]
  );

  return {
    ...mutation,
    mutate,
    mutateAsync,
  };
};
