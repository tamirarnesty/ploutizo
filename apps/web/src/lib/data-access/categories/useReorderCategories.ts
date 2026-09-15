import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { reorderByIds } from '@/lib/reorderByIds';
import { apiFetch } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';
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
  const access = useActiveHouseholdAccess();
  return useOptimisticListMutation<Category, string[], { ok: boolean }>({
    queryKey: householdQueryKey(access, 'categories'),
    mutationFn: reorderCategories,
    updateCache: (items, orderedIds) => reorderByIds(items, orderedIds),
  });
};
