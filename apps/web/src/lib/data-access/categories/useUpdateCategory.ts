import { useQueryClient } from '@tanstack/react-query';
import type { ColourToken } from '@ploutizo/types';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { Category } from './useGetCategories';

interface UpdateCategoryBody {
  name?: string;
  icon?: string;
  colour?: ColourToken;
}

export const updateCategory = async (
  id: string,
  body: UpdateCategoryBody
): Promise<Category> => {
  const r = await apiFetch<{ data: Category }>(`/api/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useUpdateCategory = (id: string) => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (body: UpdateCategoryBody) => updateCategory(id, body),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: ['categories'],
      }),
  });
};
