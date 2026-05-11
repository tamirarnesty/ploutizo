import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';
import type { Tag } from './useGetTags';

export const archiveTag = async (id: string): Promise<Tag> => {
  const r = await apiFetch<{ data: Tag }>(`/api/tags/${id}/archive`, {
    method: 'DELETE',
  });
  return r.data;
};

export const useArchiveTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: archiveTag,
    onSettled: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
};
