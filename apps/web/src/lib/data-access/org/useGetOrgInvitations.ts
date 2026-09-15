import { useQuery } from '@tanstack/react-query';
import type { PendingInvitation } from '@ploutizo/types';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchOrgInvitations = async (): Promise<PendingInvitation[]> => {
  const r = await apiFetch<{ data: PendingInvitation[] }>(
    '/api/households/invitations'
  );
  return r.data;
};

export const useGetOrgInvitations = (): UseQueryResult<PendingInvitation[]> => {
  const access = useActiveHouseholdAccess();
  return useQuery({
    queryKey: householdQueryKey(access, 'invitations'),
    queryFn: fetchOrgInvitations,
  });
};
