import { queryOptions, useQuery } from '@tanstack/react-query';
import type { OrgMember } from '@ploutizo/types';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchOrgMembers = async (): Promise<OrgMember[]> => {
  const r = await apiFetch<{ data: OrgMember[] }>('/api/households/members');
  return r.data;
};

export const orgMembersQueryOptions = (access: ActiveHouseholdAccess) =>
  queryOptions({
    queryKey: householdQueryKey(access, 'org-members'),
    queryFn: fetchOrgMembers,
  });

export const useGetOrgMembers = (): UseQueryResult<OrgMember[]> => {
  const access = useActiveHouseholdAccess();
  return useQuery(orgMembersQueryOptions(access));
};
