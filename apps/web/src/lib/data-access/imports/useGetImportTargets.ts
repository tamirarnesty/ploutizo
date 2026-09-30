import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { dataEnvelope, importTargetAccountSchema } from '@ploutizo/validators';
import type { ImportTargetAccount } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import { importTargetsQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchImportTargets = async (
  signal?: AbortSignal
): Promise<ImportTargetAccount[]> => {
  const r = await apiFetch(
    '/api/imports/targets',
    dataEnvelope(z.array(importTargetAccountSchema)),
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
