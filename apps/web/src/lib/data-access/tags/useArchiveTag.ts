import { apiFetch } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';
import type { Tag } from './useGetTags';

export const archiveTag = async (id: string): Promise<Tag> => {
  const r = await apiFetch<{ data: Tag }>(`/api/tags/${id}/archive`, {
    method: 'DELETE',
  });
  return r.data;
};

export const useArchiveTag = () =>
  useOptimisticListMutation<Tag, string, Tag>({
    queryKey: ['tags'],
    mutationFn: archiveTag,
    updateCache: (items, id) => items.filter((t) => t.id !== id),
  });
