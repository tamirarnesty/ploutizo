import { parseColourToken } from '@ploutizo/validators';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { ColourToken } from '@ploutizo/validators';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
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

const selectCategories = (data: Category[]) =>
  data.map((c) => ({
    ...c,
    colour: parseColourToken(c.colour),
  }));

export const categoriesQueryOptions = (access: ActiveHouseholdAccess) =>
  queryOptions({
    queryKey: householdQueryKey(access, 'categories'),
    queryFn: fetchCategories,
    select: selectCategories,
  });

export const useGetCategories = (): UseQueryResult<Category[]> => {
  const access = useActiveHouseholdAccess();
  return useQuery(categoriesQueryOptions(access));
};
