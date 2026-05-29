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
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['categories'] });
      const previous = qc.getQueryData<Category[]>(['categories']);
      if (previous) {
        qc.setQueryData(
          ['categories'],
          previous.filter((c) => c.id !== id)
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(['categories'], context.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};
