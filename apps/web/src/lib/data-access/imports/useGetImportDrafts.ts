import { queryOptions, useQuery } from '@tanstack/react-query';
import type { ImportDraftSummary } from '@ploutizo/types';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
import { apiFetch } from '@/lib/queryClient';
import { activeImportDraftsQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchActiveImportDrafts = async (): Promise<
  ImportDraftSummary[]
> => {
  const r = await apiFetch<{ data: ImportDraftSummary[] }>(
    '/api/imports/drafts'
  );
  return r.data;
};

export const activeImportDraftsQueryOptions = (access: ActiveHouseholdAccess) =>
  queryOptions({
    queryKey: activeImportDraftsQueryKey(access),
    queryFn: fetchActiveImportDrafts,
  });

type UseGetImportDraftsOptions = {
  enabled?: boolean;
};

export const useGetImportDrafts = (
  options?: UseGetImportDraftsOptions
): UseQueryResult<ImportDraftSummary[]> => {
  const access = useActiveHouseholdAccess();

  return useQuery({
    ...activeImportDraftsQueryOptions(access),
    enabled: options?.enabled ?? true,
  });
};
