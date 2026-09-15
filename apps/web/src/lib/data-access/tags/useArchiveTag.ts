import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';
import type { Tag } from './useGetTags';

export const archiveTag = async (id: string): Promise<Tag> => {
  const r = await apiFetch<{ data: Tag }>(`/api/tags/${id}/archive`, {
    method: 'DELETE',
  });
  return r.data;
};

export const useArchiveTag = () => {
  const access = useActiveHouseholdAccess();
  return useOptimisticListMutation<Tag, string, Tag>({
    queryKey: householdQueryKey(access, 'tags'),
    mutationFn: archiveTag,
    updateCache: (items, id) => items.filter((t) => t.id !== id),
  });
};
