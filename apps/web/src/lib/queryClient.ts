import { QueryClient } from '@tanstack/react-query';

// API base URL from env var — never hardcode ploutizo.app or localhost
const API_BASE_URL = import.meta.env.VITE_API_URL as string;

// Token getter is set at app init via setTokenGetter() before any queries run
let tokenGetter: (() => Promise<string | null>) | null = null;

export const setTokenGetter = (getter: () => Promise<string | null>) => {
  tokenGetter = getter;
};

export const queryClient = new QueryClient({
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

// Typed API fetch helper — all API calls go through this, never raw fetch
export const apiFetch = async <T>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const token = tokenGetter ? await tokenGetter() : null;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }));
    throw error;
  }
  return res.json() as Promise<T>;
};
