import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';

export interface Category {
  id: string;
  orgId: string;
  name: string;
  icon: string | null;
  colour: string | null;
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
  });
};
