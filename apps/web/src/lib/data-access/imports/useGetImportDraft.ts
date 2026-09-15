import { queryOptions, useQuery } from '@tanstack/react-query';
import type { ImportDraft } from '@ploutizo/types';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import { importDraftQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchImportDraft = async (id: string): Promise<ImportDraft> => {
  const r = await apiFetch<{ data: ImportDraft }>(`/api/imports/drafts/${id}`);
  return r.data;
};

export const importDraftQueryOptions = (
  access: ActiveHouseholdAccess,
  id: string
) =>
  queryOptions({
    queryKey: importDraftQueryKey(access, id),
    queryFn: () => fetchImportDraft(id),
  });

export const useGetImportDraft = (
  id: string | null
): UseQueryResult<ImportDraft> => {
  const access = useActiveHouseholdAccess();
  return useQuery({
    ...importDraftQueryOptions(access, id ?? ''),
    enabled: Boolean(id),
  });
};
