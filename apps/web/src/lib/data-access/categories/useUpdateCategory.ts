import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';
import type { Category } from './useGetCategories';

interface UpdateCategoryBody {
  name?: string;
  icon?: string;
  colour?: string;
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
  return useMutation({
    mutationFn: (body: UpdateCategoryBody) => updateCategory(id, body),
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};
