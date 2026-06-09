import { useQuery } from '@tanstack/react-query';
import type { ImportTargetAccount } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const importTargetsQueryKey = ['imports', 'targets'] as const;

export const fetchImportTargets = async (): Promise<ImportTargetAccount[]> => {
  const r = await apiFetch<{ data: ImportTargetAccount[] }>(
    '/api/imports/targets'
  );
  return r.data;
};

export const useGetImportTargets = (): UseQueryResult<ImportTargetAccount[]> =>
  useQuery({
    queryKey: importTargetsQueryKey,
    queryFn: fetchImportTargets,
  });
