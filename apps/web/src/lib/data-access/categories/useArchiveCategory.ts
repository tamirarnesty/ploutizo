import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';
import type { Category } from './useGetCategories';

export const archiveCategory = async (id: string): Promise<Category> => {
  const r = await apiFetch<{ data: Category }>(
    `/api/categories/${id}/archive`,
    {
      method: 'DELETE',
    }
  );
  return r.data;
};

export const useArchiveCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: archiveCategory,
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};
