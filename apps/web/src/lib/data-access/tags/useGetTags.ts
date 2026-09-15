import { queryOptions, useQuery } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
import type { UseQueryResult } from '@tanstack/react-query';

export interface Tag {
  id: string;
  orgId: string;
  name: string;
  colour: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export const fetchTags = async (): Promise<Tag[]> => {
  const r = await apiFetch<{ data: Tag[] }>('/api/tags');
  return r.data;
};

export const tagsQueryOptions = (access: ActiveHouseholdAccess) =>
  queryOptions({
    queryKey: householdQueryKey(access, 'tags'),
    queryFn: fetchTags,
  });

export const useGetTags = (): UseQueryResult<Tag[]> => {
  const access = useActiveHouseholdAccess();
  return useQuery(tagsQueryOptions(access));
};
