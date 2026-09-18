import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useAccess } from '@/lib/access/AccessProvider';
import type { AccessState } from '@/lib/access/access-state';
import type {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';

export const isHouseholdAccessReady = (isReady: boolean, access: AccessState) =>
  isReady && access.status === 'signed-in-with-active-household';

const whileHouseholdBearerPending = <TResult extends { data: unknown }>(
  result: TResult
): TResult => ({
  ...result,
  data: undefined,
  isPending: true,
  isLoading: true,
  isFetching: false,
  isSuccess: false,
  isError: false,
  error: null,
  status: 'pending',
  fetchStatus: 'idle',
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
  const householdReady = isHouseholdAccessReady(isReady, access);
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
  const householdReady = isHouseholdAccessReady(isReady, access);
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
  options: UseMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> => {
  const { isReady, access } = useAccess();
  const householdReady = isHouseholdAccessReady(isReady, access);
  const { mutationFn, ...rest } = options;

  return useMutation({
    ...rest,
    mutationFn: (variables, mutateContext) => {
      if (!householdReady) {
        const error = new Error('Household bearer unavailable');
        error.name = 'HouseholdBearerUnavailableError';
        throw error;
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
