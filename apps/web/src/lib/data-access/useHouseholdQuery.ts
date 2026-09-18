import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useAccess } from '@/lib/access/AccessProvider';
import { isHouseholdBearerReady } from '@/lib/access/household-loader-ready';
import { createHouseholdBearerUnavailableError } from '@/lib/queryClient';
import type {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';

export const useHouseholdQuery = <
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[],
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> => {
  const { isReady, access } = useAccess();
  const householdReady = isHouseholdBearerReady(isReady, access);

  return useQuery({
    ...options,
    enabled: householdReady && (options.enabled ?? true),
  });
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
  const householdReady = isHouseholdBearerReady(isReady, access);

  return useInfiniteQuery({
    ...options,
    enabled: householdReady && (options.enabled ?? true),
  });
};

export const useHouseholdMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> => {
  const { isReady, access } = useAccess();
  const householdReady = isHouseholdBearerReady(isReady, access);
  const { mutationFn, ...rest } = options;

  return useMutation({
    ...rest,
    mutationFn: (variables, mutateContext) => {
      if (!householdReady) {
        throw createHouseholdBearerUnavailableError();
      }
      if (!mutationFn) {
        const error = new Error('mutationFn is required');
        error.name = 'MissingMutationFnError';
        throw error;
      }
      return mutationFn(variables, mutateContext);
    },
  });
};
