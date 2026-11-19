import { categorySchema } from '@ploutizo/validators';
import { defineListQuery } from '@/lib/data-access/defineListQuery';
import { useOfflineReadableQuery } from '@/lib/offline/offline-query';
import { readCategories } from '@/lib/offline/offline-read-store';

const list = defineListQuery({
  key: 'categories',
  path: '/api/categories',
  itemSchema: categorySchema,
});

export const categoriesQueryKey = list.queryKey;
export const fetchCategories = list.fetch;
export const categoriesQueryOptions = list.queryOptions;
export const useGetCategories = () => {
  const query = list.useQuery();
  return useOfflineReadableQuery(query, readCategories);
};
