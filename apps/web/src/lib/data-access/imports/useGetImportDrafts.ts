import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { dataEnvelope, importDraftSummarySchema } from '@ploutizo/validators';
import type { ImportDraftSummary } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import { activeImportDraftsQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchActiveImportDrafts = async (
  signal?: AbortSignal
): Promise<ImportDraftSummary[]> => {
  const r = await apiFetch(
    '/api/imports/drafts',
    dataEnvelope(z.array(importDraftSummarySchema)),
    { signal }
  );
  return r.data;
};

export const activeImportDraftsQueryOptions = queryOptions({
  queryKey: activeImportDraftsQueryKey,
  queryFn: ({ signal }) => fetchActiveImportDrafts(signal),
});

type UseGetImportDraftsOptions = {
  enabled?: boolean;
};

export const useGetImportDrafts = (
  options?: UseGetImportDraftsOptions
): UseQueryResult<ImportDraftSummary[]> => {
  return useHouseholdQuery({
    ...activeImportDraftsQueryOptions,
    enabled: options?.enabled ?? true,
  });
};
