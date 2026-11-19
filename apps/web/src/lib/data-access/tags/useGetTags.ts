import { tagSchema } from '@ploutizo/validators';
import { defineListQuery } from '@/lib/data-access/defineListQuery';
import { useOfflineReadableQuery } from '@/lib/offline/offline-query';
import { readTags } from '@/lib/offline/offline-read-store';

const list = defineListQuery({
  key: 'tags',
  path: '/api/tags',
  itemSchema: tagSchema,
});

export const tagsQueryKey = list.queryKey;
export const fetchTags = list.fetch;
export const tagsQueryOptions = list.queryOptions;
export const useGetTags = () => {
  const query = list.useQuery();
  return useOfflineReadableQuery(query, readTags);
};
