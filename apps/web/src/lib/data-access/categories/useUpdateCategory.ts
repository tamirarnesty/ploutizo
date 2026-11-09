import { categorySchema, dataEnvelope } from '@ploutizo/validators';
import type { ColourToken } from '@ploutizo/types';
import type { Category } from '@ploutizo/validators';
import { useInvalidatingMutation } from '@/lib/data-access/useInvalidatingMutation';
import { dashboardOverviewQueryKey } from '@/lib/data-access/dashboard/useGetDashboardOverview';
import { apiFetch } from '@/lib/queryClient';
import { categoriesQueryKey } from './useGetCategories';

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

export const useUpdateCategory = (id: string) =>
  // The dashboard overview carries category names and colours, so a rename or recolour must refresh it too.
  useInvalidatingMutation(
    (body: UpdateCategoryBody) => updateCategory(id, body),
    [categoriesQueryKey, dashboardOverviewQueryKey]
  );
