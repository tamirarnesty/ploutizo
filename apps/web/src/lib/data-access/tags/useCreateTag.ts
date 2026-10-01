import { useQueryClient } from '@tanstack/react-query';
import { dataEnvelope, tagSchema } from '@ploutizo/validators';
import type { Tag } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';

interface CreateTagBody {
  name: string;
  colour?: string;
}

const optimisticTagId = (name: string) =>
  `optimistic-${name.trim().toLowerCase()}`;

export const createTag = async (body: CreateTagBody): Promise<Tag> => {
  const r = await apiFetch('/api/tags', dataEnvelope(tagSchema), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useCreateTag = () => {
  const qc = useQueryClient();
  const tagsQueryKey = ['tags'];
  return useOptimisticListMutation<Tag, CreateTagBody, Tag>({
    queryKey: tagsQueryKey,
    mutationFn: createTag,
    updateCache: (items, { name }) => {
      const trimmed = name.trim();
      if (items.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
        return items;
      }
      const optimistic: Tag = {
        id: optimisticTagId(trimmed),
        orgId: '',
        name: trimmed,
        colour: null,
        archivedAt: null,
        createdAt: new Date().toISOString(),
      };
      return [...items, optimistic];
    },
    onSuccess: (created, { name }) => {
      const placeholderId = optimisticTagId(name);
      qc.setQueryData<Tag[]>(tagsQueryKey, (items = []) => {
        const withoutPlaceholder = items.filter(
          (t) => t.id !== created.id && t.id !== placeholderId
        );
        return [...withoutPlaceholder, created];
      });
    },
  });
};
