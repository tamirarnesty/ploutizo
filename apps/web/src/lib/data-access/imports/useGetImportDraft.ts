import { queryOptions } from '@tanstack/react-query';
import { dataEnvelope, importDraftSchema } from '@ploutizo/validators';
import type { ImportDraft } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import { importDraftClientQueryPolicy } from './importDraftClientQueryPolicy';
import { importDraftQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchImportDraft = async (
  id: string,
  signal?: AbortSignal
): Promise<ImportDraft> => {
  const r = await apiFetch(
    `/api/imports/drafts/${id}`,
    dataEnvelope(importDraftSchema),
    { signal }
  );
  return r.data;
};

export const importDraftQueryOptions = (id: string) =>
  queryOptions({
    queryKey: importDraftQueryKey(id),
    queryFn: ({ signal }) => fetchImportDraft(id, signal),
    ...importDraftClientQueryPolicy,
  });

export const useGetImportDraft = (
  id: string | null,
  options?: { enabled?: boolean }
): UseQueryResult<ImportDraft> => {
  return useHouseholdQuery({
    ...importDraftQueryOptions(id ?? ''),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
};
