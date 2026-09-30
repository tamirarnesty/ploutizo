import type { Category } from '@ploutizo/validators';
import { reorderByIds } from '@/lib/reorderByIds';
import { apiSend } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';

export const reorderCategories = (orderedIds: string[]): Promise<void> =>
  apiSend('/api/categories/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  });

export const useReorderCategories = () => {
  return useOptimisticListMutation<Category, string[], void>({
    queryKey: ['categories'],
    mutationFn: reorderCategories,
    updateCache: (items, orderedIds) => reorderByIds(items, orderedIds),
  });
};
