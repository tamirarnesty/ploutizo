import { categorySchema, dataEnvelope } from '@ploutizo/validators';
import type { Category } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';

export const archiveCategory = async (id: string): Promise<Category> => {
  const r = await apiFetch(
    `/api/categories/${id}/archive`,
    dataEnvelope(categorySchema),
    { method: 'DELETE' }
  );
  return r.data;
};

export const useArchiveCategory = () => {
  return useOptimisticListMutation<Category, string, Category>({
    queryKey: ['categories'],
    mutationFn: archiveCategory,
    updateCache: (items, id) => items.filter((c) => c.id !== id),
  });
};
