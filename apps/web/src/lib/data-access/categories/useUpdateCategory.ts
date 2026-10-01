import { useQueryClient } from '@tanstack/react-query';
import { categorySchema, dataEnvelope } from '@ploutizo/validators';
import type { ColourToken } from '@ploutizo/types';
import type { Category } from '@ploutizo/validators';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { dashboardOverviewQueryKey } from '@/lib/data-access/dashboard/useGetDashboardOverview';
import { apiFetch } from '@/lib/queryClient';

interface UpdateCategoryBody {
  name?: string;
  icon?: string;
  colour?: ColourToken;
}

export const updateCategory = async (
  id: string,
  body: UpdateCategoryBody
): Promise<Category> => {
  const r = await apiFetch(
    `/api/categories/${id}`,
    dataEnvelope(categorySchema),
    { method: 'PATCH', body: JSON.stringify(body) }
  );
  return r.data;
};

export const useUpdateCategory = (id: string) => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (body: UpdateCategoryBody) => updateCategory(id, body),
    // The dashboard overview carries category names and colours, so a rename or recolour must refresh it too.
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['categories'] }),
        qc.invalidateQueries({ queryKey: dashboardOverviewQueryKey }),
      ]),
  });
};
