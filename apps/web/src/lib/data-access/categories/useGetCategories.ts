import { queryOptions } from '@tanstack/react-query';
import type { ColourToken } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export interface Category {
  id: string;
  orgId: string;
  name: string;
  icon: string | null;
  colour: ColourToken;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
}

export const fetchCategories = async (
  signal?: AbortSignal
): Promise<Category[]> => {
  const r = await apiFetch<{ data: Category[] }>('/api/categories', {
    signal,
  });
  return r.data;
};

export const categoriesQueryOptions = queryOptions({
  queryKey: ['categories'],
  queryFn: ({ signal }) => fetchCategories(signal),
});

export const useGetCategories = (): UseQueryResult<Category[]> => {
  return useHouseholdQuery(categoriesQueryOptions);
};
