import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { dataEnvelope } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

interface DefineListQueryConfig<TItem> {
  /** Query key root — also the invalidation prefix for this resource. */
  key: string;
  /** List endpoint path. */
  path: string;
  /** Zod schema for one item; the endpoint returns `dataEnvelope(z.array(itemSchema))`. */
  itemSchema: z.ZodType<TItem>;
}

/**
 * Standard org-scoped list endpoint: `GET {path}` → `{ data: TItem[] }`.
 * Produces the fetch function, queryOptions, and household-gated query hook
 * shared by every simple list resource.
 */
export const defineListQuery = <TItem>({
  key,
  path,
  itemSchema,
}: DefineListQueryConfig<TItem>) => {
  const listSchema = dataEnvelope(z.array(itemSchema));
  const queryKey = [key] as const;

  const fetch = async (signal?: AbortSignal): Promise<TItem[]> => {
    const r = await apiFetch(path, listSchema, { signal });
    return r.data;
  };

  const options = queryOptions({
    queryKey,
    queryFn: ({ signal }) => fetch(signal),
  });

  return {
    queryKey,
    fetch,
    queryOptions: options,
    useQuery: (): UseQueryResult<TItem[]> => useHouseholdQuery(options),
  };
};
