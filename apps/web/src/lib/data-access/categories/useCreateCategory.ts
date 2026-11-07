import { categorySchema, dataEnvelope } from '@ploutizo/validators';
import type { ColourToken } from '@ploutizo/types';
import type { Category } from '@ploutizo/validators';
import { useInvalidatingMutation } from '@/lib/data-access/useInvalidatingMutation';
import { apiFetch } from '@/lib/queryClient';
import { categoriesQueryKey } from './useGetCategories';

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

export const useCreateCategory = () =>
  useInvalidatingMutation(createCategory, [categoriesQueryKey]);
