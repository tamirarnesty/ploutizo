import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';
import type { OrgMember } from '@ploutizo/types';

export const fetchOrgMembers = async (): Promise<OrgMember[]> => {
  const r = await apiFetch<{ data: OrgMember[] }>('/api/households/members');
  return r.data;
};

export const useGetOrgMembers = (): UseQueryResult<OrgMember[]> => {
  return useQuery({
    queryKey: ['org-members'],
    queryFn: fetchOrgMembers,
  });
};
