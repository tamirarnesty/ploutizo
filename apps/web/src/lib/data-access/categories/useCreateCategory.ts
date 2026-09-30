import { useQueryClient } from '@tanstack/react-query';
import type { ColourToken } from '@ploutizo/types';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { Category } from './useGetCategories';

interface CreateCategoryBody {
  name: string;
  icon?: string;
  colour: ColourToken;
}

export const createCategory = async (
  body: CreateCategoryBody
): Promise<Category> => {
  const r = await apiFetch<{ data: Category }>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: createCategory,
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: ['categories'],
      }),
  });
};
