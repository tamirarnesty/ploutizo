import { useAuth } from '@clerk/tanstack-react-start';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { ImportDraftSummary } from '@ploutizo/types';
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

export const activeImportDraftsQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: activeImportDraftsQueryKey(orgId),
    queryFn: fetchActiveImportDrafts,
  });

type UseGetImportDraftsOptions = {
  enabled?: boolean;
};

export const useGetImportDrafts = (
  options?: UseGetImportDraftsOptions
): UseQueryResult<ImportDraftSummary[]> => {
  const { orgId } = useAuth();

  return useQuery({
    ...activeImportDraftsQueryOptions(orgId ?? ''),
    enabled: (options?.enabled ?? true) && Boolean(orgId),
  });
};
