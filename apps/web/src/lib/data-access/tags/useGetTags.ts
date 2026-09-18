import { queryOptions } from '@tanstack/react-query';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export interface Tag {
  id: string;
  orgId: string;
  name: string;
  colour: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export const fetchTags = async (signal?: AbortSignal): Promise<Tag[]> => {
  const r = await apiFetch<{ data: Tag[] }>('/api/tags', { signal });
  return r.data;
};

export const tagsQueryOptions = queryOptions({
  queryKey: ['tags'],
  queryFn: ({ signal }) => fetchTags(signal),
});

export const useGetTags = (): UseQueryResult<Tag[]> => {
  return useHouseholdQuery(tagsQueryOptions);
};
