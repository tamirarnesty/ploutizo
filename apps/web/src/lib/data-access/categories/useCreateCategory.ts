import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { Category } from './useGetCategories';

interface CreateCategoryBody {
  name: string;
  icon?: string;
  colour?: string;
}

export const createCategory = async (
  body: CreateCategoryBody
): Promise<Category> => {
  const r = await apiFetch<{ data: Category }>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useCreateCategory = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'categories'),
      }),
  });
};
