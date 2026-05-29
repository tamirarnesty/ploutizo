import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from '@tanstack/react-query';

type OptimisticListContext<TItem> = {
  previous: TItem[] | undefined;
};

type OptimisticListMutationConfig<TItem, TVariables, TData, TError> = {
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  updateCache: (items: TItem[], variables: TVariables) => TItem[];
} & Omit<
  UseMutationOptions<TData, TError, TVariables, OptimisticListContext<TItem>>,
  'mutationFn' | 'onMutate'
>;

/** TanStack Query mutation with optimistic list cache update + rollback + invalidate. */
export const useOptimisticListMutation = <
  TItem,
  TVariables,
  TData = unknown,
  TError = Error,
>(
  config: OptimisticListMutationConfig<TItem, TVariables, TData, TError>
) => {
  const qc = useQueryClient();
  const {
    queryKey,
    mutationFn,
    updateCache,
    onSettled: userOnSettled,
    onError: userOnError,
    ...rest
  } = config;

  return useMutation({
    ...rest,
    mutationFn,
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<TItem[]>(queryKey);
      if (previous) {
        qc.setQueryData(queryKey, updateCache(previous, variables));
      }
      return { previous };
    },
    onError: (...args) => {
      const context = args[2];
      if (context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
      userOnError?.(...args);
    },
    onSettled: (...args) => {
      void qc.invalidateQueries({ queryKey });
      userOnSettled?.(...args);
    },
  });
};
