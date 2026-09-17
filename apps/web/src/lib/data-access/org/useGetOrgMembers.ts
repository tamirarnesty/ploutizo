import { queryOptions } from '@tanstack/react-query';
import type { OrgMember } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchOrgMembers = async (
  signal?: AbortSignal
): Promise<OrgMember[]> => {
  const r = await apiFetch<{ data: OrgMember[] }>('/api/households/members', {
    signal,
  });
  return r.data;
};

export const orgMembersQueryOptions = () =>
  queryOptions({
    queryKey: ['members'],
    queryFn: ({ signal }) => fetchOrgMembers(signal),
  });

export const useGetOrgMembers = (): UseQueryResult<OrgMember[]> => {
  return useHouseholdQuery(orgMembersQueryOptions());
};
