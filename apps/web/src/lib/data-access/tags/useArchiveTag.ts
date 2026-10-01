import { dataEnvelope, tagSchema } from '@ploutizo/validators';
import type { Tag } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';

export const archiveTag = async (id: string): Promise<Tag> => {
  const r = await apiFetch(`/api/tags/${id}/archive`, dataEnvelope(tagSchema), {
    method: 'DELETE',
  });
  return r.data;
};

export const useArchiveTag = () => {
  return useOptimisticListMutation<Tag, string, Tag>({
    queryKey: ['tags'],
    mutationFn: archiveTag,
    updateCache: (items, id) => items.filter((t) => t.id !== id),
  });
};
