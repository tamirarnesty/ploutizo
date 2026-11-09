import { useQueryClient } from '@tanstack/react-query';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import type { HouseholdMutationOptions } from '@/lib/data-access/useHouseholdQuery';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

type Invalidation = QueryKey | ((qc: QueryClient) => unknown);

type InvalidatingMutationOptions<TData, TError, TVariables, TContext> = Omit<
  HouseholdMutationOptions<TData, TError, TVariables, TContext>,
  'mutationFn'
>;

/**
 * Mutation that invalidates the given query keys once it settles. Entries may
 * be query keys or `(qc) => …` helpers for multi-key invalidation
 * (e.g. `invalidateImportTargetsQuery`).
 */
export const useInvalidatingMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidates: readonly Invalidation[],
  options?: InvalidatingMutationOptions<TData, TError, TVariables, TContext>
) => {
  const qc = useQueryClient();
  return useHouseholdMutation<TData, TError, TVariables, TContext>({
    ...options,
    mutationFn,
    onSettled: async (...args) => {
      await Promise.all(
        invalidates.map((target) =>
          typeof target === 'function'
            ? target(qc)
            : qc.invalidateQueries({ queryKey: target })
        )
      );
      await options?.onSettled?.(...args);
    },
  });
};
