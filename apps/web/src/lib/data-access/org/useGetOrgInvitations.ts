import { pendingInvitationSchema } from '@ploutizo/validators';
import { defineListQuery } from '@/lib/data-access/defineListQuery';

const list = defineListQuery({
  key: 'invitations',
  path: '/api/households/invitations',
  itemSchema: pendingInvitationSchema,
});

export const orgInvitationsQueryKey = list.queryKey;
export const fetchOrgInvitations = list.fetch;
export const orgInvitationsQueryOptions = list.queryOptions;
export const useGetOrgInvitations = list.useQuery;
