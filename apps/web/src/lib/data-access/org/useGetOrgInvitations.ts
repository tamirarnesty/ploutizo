import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { dataEnvelope, pendingInvitationSchema } from '@ploutizo/validators';
import type { PendingInvitation } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchOrgInvitations = async (
  signal?: AbortSignal
): Promise<PendingInvitation[]> => {
  const r = await apiFetch(
    '/api/households/invitations',
    dataEnvelope(z.array(pendingInvitationSchema)),
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
