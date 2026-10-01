import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { dataEnvelope, tagSchema } from '@ploutizo/validators';
import type { Tag } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchTags = async (signal?: AbortSignal): Promise<Tag[]> => {
  const r = await apiFetch('/api/tags', dataEnvelope(z.array(tagSchema)), {
    signal,
  });
  return r.data;
};

export const tagsQueryOptions = queryOptions({
  queryKey: ['tags'],
  queryFn: ({ signal }) => fetchTags(signal),
});

export const useGetTags = (): UseQueryResult<Tag[]> => {
  return useHouseholdQuery(tagsQueryOptions);
};
