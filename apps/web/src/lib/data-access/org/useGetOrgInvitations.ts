import type { PendingInvitation } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchOrgInvitations = async (): Promise<PendingInvitation[]> => {
  const r = await apiFetch<{ data: PendingInvitation[] }>(
    '/api/households/invitations'
  );
  return r.data;
};

export const useGetOrgInvitations = (): UseQueryResult<PendingInvitation[]> => {
  return useHouseholdQuery({
    queryKey: ['invitations'],
    queryFn: fetchOrgInvitations,
  });
};
