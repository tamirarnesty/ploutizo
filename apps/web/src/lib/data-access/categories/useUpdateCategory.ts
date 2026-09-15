import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { Category } from './useGetCategories';

interface UpdateCategoryBody {
  name?: string;
  icon?: string;
  colour?: string;
}

export const updateCategory = async (
  id: string,
  body: UpdateCategoryBody
): Promise<Category> => {
  const r = await apiFetch<{ data: Category }>(`/api/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useUpdateCategory = (id: string) => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCategoryBody) => updateCategory(id, body),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'categories'),
      }),
  });
};
