import { apiFetch } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';
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

export const useArchiveCategory = () =>
  useOptimisticListMutation<Category, string, Category>({
    queryKey: ['categories'],
    mutationFn: archiveCategory,
    updateCache: (items, id) => items.filter((c) => c.id !== id),
  });
