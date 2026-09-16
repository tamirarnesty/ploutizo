import { MutationCache, QueryClient } from '@tanstack/react-query';

// API base URL from env var — never hardcode ploutizo.app or localhost
const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export const createQueryClient = () => {
  // Bumped when the access working set ends so callbacks from the previous
  // household cannot write snapshots back into the shared query cache.
  let queryCacheWorkingSetEpoch = 0;

  const bindMutationCallbackToWorkingSet = <
    TCallback extends (...args: never[]) => unknown,
  >(
    startedAtEpoch: number,
    callback: TCallback | undefined
  ): TCallback | undefined => {
    if (!callback) {
      return undefined;
    }
    return ((...args: Parameters<TCallback>) => {
      if (startedAtEpoch !== queryCacheWorkingSetEpoch) {
        return;
      }
      return callback(...args);
    }) as TCallback;
  };

  const createWorkingSetBoundMutationCache = () => {
    const mutationCache = new MutationCache();
    const build = mutationCache.build.bind(mutationCache);
    mutationCache.build = ((client, options, state) => {
      const startedAtEpoch = queryCacheWorkingSetEpoch;
      const mutation = build(client, options, state);
      mutation.setOptions({
        ...mutation.options,
        onMutate: bindMutationCallbackToWorkingSet(
          startedAtEpoch,
          mutation.options.onMutate
        ),
        onSuccess: bindMutationCallbackToWorkingSet(
          startedAtEpoch,
          mutation.options.onSuccess
        ),
        onError: bindMutationCallbackToWorkingSet(
          startedAtEpoch,
          mutation.options.onError
        ),
        onSettled: bindMutationCallbackToWorkingSet(
          startedAtEpoch,
          mutation.options.onSettled
        ),
      });
      return mutation;
    }) as MutationCache['build'];
    return mutationCache;
  };

  const queryClient = new QueryClient({
    mutationCache: createWorkingSetBoundMutationCache(),
    defaultOptions: {
      queries: {
        // staleTime: 60s — stale-while-revalidate semantics (client-swr-dedup rule).
        // TanStack Query deduplicates requests with the same queryKey across all
        // component instances. Queries are served from cache for 60s before
        // background refetch. Increase per-query if data changes infrequently.
        staleTime: 1000 * 60,
        retry: 1,
      },
    },
  });

  return {
    queryClient,
    endWorkingSetQueryCache: () => {
      queryCacheWorkingSetEpoch += 1;
      void queryClient.cancelQueries();
      queryClient.clear();
    },
  };
};

const browserQuery = createQueryClient();

export const queryClient = browserQuery.queryClient;

export const endWorkingSetQueryCache = () => {
  browserQuery.endWorkingSetQueryCache();
};

// Typed API fetch helper — all API calls go through this, never raw fetch
export const apiFetch = async <T>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const { getHouseholdBearer } = await import('@/lib/access');
  const token = await getHouseholdBearer();
  if (!token) {
    throw new Error('Household bearer unavailable');
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }));
    throw error;
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
};

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    errors?: { message?: string }[];
  };
}

export const getApiErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const maybeError = error as ApiErrorBody;
  return maybeError.error?.code;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Couldn't process that request."
): string => {
  const nativeMessage =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : undefined;

  const maybeError = error as ApiErrorBody;
  return (
    nativeMessage ??
    maybeError.error?.message ??
    maybeError.error?.errors?.[0]?.message ??
    fallback
  );
};
