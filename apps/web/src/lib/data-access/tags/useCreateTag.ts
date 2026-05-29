import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';
import type { Tag } from './useGetTags';

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
  return useOptimisticListMutation<Tag, CreateTagBody, Tag>({
    queryKey: ['tags'],
    mutationFn: createTag,
    updateCache: (items, { name }) => {
      const trimmed = name.trim();
      if (items.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
        return items;
      }
      const optimistic: Tag = {
        id: `optimistic-${trimmed}`,
        orgId: '',
        name: trimmed,
        colour: null,
        archivedAt: null,
        createdAt: new Date().toISOString(),
      };
      return [...items, optimistic];
    },
    onSuccess: (created) => {
      qc.setQueryData<Tag[]>(['tags'], (items = []) => {
        const withoutPlaceholder = items.filter(
          (t) =>
            t.id !== created.id &&
            !t.id.startsWith('optimistic-') &&
            t.name.toLowerCase() !== created.name.toLowerCase()
        );
        return [...withoutPlaceholder, created];
      });
    },
  });
};
