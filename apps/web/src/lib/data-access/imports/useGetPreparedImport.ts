import type { ImportPreparedConfirmation } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { fetchPreparedImport } from './fetchPreparedImport';
import { importPreparedQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const useGetPreparedImport = (
  draftId: string
): UseQueryResult<ImportPreparedConfirmation> => {
  return useHouseholdQuery({
    queryKey: importPreparedQueryKey(draftId),
    queryFn: () => fetchPreparedImport(draftId),
    retry: false,
  });
};
