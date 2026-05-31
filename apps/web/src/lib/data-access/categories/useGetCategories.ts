import { parseColourToken } from '@ploutizo/validators';
import { useQuery } from '@tanstack/react-query';
import type { ColourToken } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export interface Category {
  id: string;
  orgId: string;
  name: string;
  icon: string | null;
  colour: ColourToken | null;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
}

export const fetchCategories = async (): Promise<Category[]> => {
  const r = await apiFetch<{ data: Category[] }>('/api/categories');
  return r.data;
};

export const useGetCategories = (): UseQueryResult<Category[]> => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    select: (data) =>
      data.map((c) => ({
        ...c,
        colour: parseColourToken(c.colour),
      })),
  });
};
