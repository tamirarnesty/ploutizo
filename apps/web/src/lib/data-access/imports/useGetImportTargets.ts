import { queryOptions } from '@tanstack/react-query';
import type { ImportTargetAccount } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import { importTargetsQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchImportTargets = async (
  signal?: AbortSignal
): Promise<ImportTargetAccount[]> => {
  const r = await apiFetch<{ data: ImportTargetAccount[] }>(
    '/api/imports/targets',
    { signal }
  );
  return r.data;
};

export const importTargetsQueryOptions = queryOptions({
  queryKey: importTargetsQueryKey,
  queryFn: ({ signal }) => fetchImportTargets(signal),
});

export const useGetImportTargets = (): UseQueryResult<
  ImportTargetAccount[]
> => {
  return useHouseholdQuery(importTargetsQueryOptions);
};
