import { queryOptions } from '@tanstack/react-query';
import type { PendingInvitation } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchOrgInvitations = async (
  signal?: AbortSignal
): Promise<PendingInvitation[]> => {
  const r = await apiFetch<{ data: PendingInvitation[] }>(
    '/api/households/invitations',
    { signal }
  );
  return r.data;
};

export const orgInvitationsQueryOptions = queryOptions({
  queryKey: ['invitations'],
  queryFn: ({ signal }) => fetchOrgInvitations(signal),
});

export const useGetOrgInvitations = (): UseQueryResult<PendingInvitation[]> => {
  return useHouseholdQuery(orgInvitationsQueryOptions);
};
