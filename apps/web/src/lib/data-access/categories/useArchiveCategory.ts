import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
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

export const useArchiveCategory = () => {
  const access = useActiveHouseholdAccess();
  return useOptimisticListMutation<Category, string, Category>({
    queryKey: householdQueryKey(access, 'categories'),
    mutationFn: archiveCategory,
    updateCache: (items, id) => items.filter((c) => c.id !== id),
  });
};
