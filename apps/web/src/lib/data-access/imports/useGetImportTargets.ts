import { queryOptions, useQuery } from '@tanstack/react-query';
import type { ImportTargetAccount } from '@ploutizo/types';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
import { apiFetch } from '@/lib/queryClient';
import { importTargetsQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchImportTargets = async (): Promise<ImportTargetAccount[]> => {
  const r = await apiFetch<{ data: ImportTargetAccount[] }>(
    '/api/imports/targets'
  );
  return r.data;
};

export const importTargetsQueryOptions = (access: ActiveHouseholdAccess) =>
  queryOptions({
    queryKey: importTargetsQueryKey(access),
    queryFn: fetchImportTargets,
  });

export const useGetImportTargets = (): UseQueryResult<
  ImportTargetAccount[]
> => {
  const access = useActiveHouseholdAccess();
  return useQuery(importTargetsQueryOptions(access));
};
