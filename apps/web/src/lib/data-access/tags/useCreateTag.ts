import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Tag } from './useGetTags';
import { apiFetch } from '@/lib/queryClient';

interface CreateTagBody {
  name: string;
  colour?: string;
}

export const createTag = async (body: CreateTagBody): Promise<Tag> => {
  const r = await apiFetch<{ data: Tag }>('/api/tags', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useCreateTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSettled: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
};
