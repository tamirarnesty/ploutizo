import { useQueryClient } from '@tanstack/react-query';
import { categorySchema, dataEnvelope } from '@ploutizo/validators';
import type { ColourToken } from '@ploutizo/types';
import type { Category } from '@ploutizo/validators';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';

interface CreateCategoryBody {
  name: string;
  icon?: string;
  colour: ColourToken;
}

export const createCategory = async (
  body: CreateCategoryBody
): Promise<Category> => {
  const r = await apiFetch('/api/categories', dataEnvelope(categorySchema), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: createCategory,
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: ['categories'],
      }),
  });
};
