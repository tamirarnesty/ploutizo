import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { categorySchema, dataEnvelope } from '@ploutizo/validators';
import type { Category } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchCategories = async (
  signal?: AbortSignal
): Promise<Category[]> => {
  const r = await apiFetch(
    '/api/categories',
    dataEnvelope(z.array(categorySchema)),
    { signal }
  );
  return r.data;
};

export const categoriesQueryOptions = queryOptions({
  queryKey: ['categories'],
  queryFn: ({ signal }) => fetchCategories(signal),
});

export const useGetCategories = (): UseQueryResult<Category[]> => {
  return useHouseholdQuery(categoriesQueryOptions);
};
