import { categorySchema } from '@ploutizo/validators';
import { defineListQuery } from '@/lib/data-access/defineListQuery';

const list = defineListQuery({
  key: 'categories',
  path: '/api/categories',
  itemSchema: categorySchema,
});

export const categoriesQueryKey = list.queryKey;
export const fetchCategories = list.fetch;
export const categoriesQueryOptions = list.queryOptions;
export const useGetCategories = list.useQuery;
