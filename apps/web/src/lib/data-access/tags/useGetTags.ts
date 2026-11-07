import { tagSchema } from '@ploutizo/validators';
import { defineListQuery } from '@/lib/data-access/defineListQuery';

const list = defineListQuery({
  key: 'tags',
  path: '/api/tags',
  itemSchema: tagSchema,
});

export const tagsQueryKey = list.queryKey;
export const fetchTags = list.fetch;
export const tagsQueryOptions = list.queryOptions;
export const useGetTags = list.useQuery;
