import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { dataEnvelope, orgMemberSchema } from '@ploutizo/validators';
import type { OrgMember } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchHouseholdMembers = async (
  signal?: AbortSignal
): Promise<OrgMember[]> => {
  const r = await apiFetch(
    '/api/households/members',
    dataEnvelope(z.array(orgMemberSchema)),
    { signal }
  );
  return r.data;
};

export const householdMembersQueryOptions = queryOptions({
  queryKey: ['members'],
  queryFn: ({ signal }) => fetchHouseholdMembers(signal),
});

export const useGetHouseholdMembers = (): UseQueryResult<OrgMember[]> => {
  return useHouseholdQuery(householdMembersQueryOptions);
};
