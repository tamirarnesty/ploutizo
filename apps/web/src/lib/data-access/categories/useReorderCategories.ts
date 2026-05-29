import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reorderByIds } from '@/lib/reorderByIds';
import { apiFetch } from '@/lib/queryClient';
import type { Category } from './useGetCategories';

export const reorderCategories = async (
  orderedIds: string[]
): Promise<{ ok: boolean }> => {
  const r = await apiFetch<{ data: { ok: boolean } }>(
    '/api/categories/reorder',
    {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds }),
    }
  );
  return r.data;
};

export const useReorderCategories = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderCategories,
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ['categories'] });
      const previous = qc.getQueryData<Category[]>(['categories']);
      if (previous) {
        qc.setQueryData(['categories'], reorderByIds(previous, orderedIds));
      }
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        qc.setQueryData(['categories'], context.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};
