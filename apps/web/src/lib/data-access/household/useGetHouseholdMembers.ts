import { queryOptions } from '@tanstack/react-query';
import type { OrgMember } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchHouseholdMembers = async (
  signal?: AbortSignal
): Promise<OrgMember[]> => {
  const r = await apiFetch<{ data: OrgMember[] }>('/api/households/members', {
    signal,
  });
  return r.data;
};

export const householdMembersQueryOptions = queryOptions({
  queryKey: ['members'],
  queryFn: ({ signal }) => fetchHouseholdMembers(signal),
});

export const useGetHouseholdMembers = (): UseQueryResult<OrgMember[]> => {
  return useHouseholdQuery(householdMembersQueryOptions);
};
