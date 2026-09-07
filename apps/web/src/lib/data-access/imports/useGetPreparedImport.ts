import { useQuery } from '@tanstack/react-query';
import type { ImportPreparedConfirmation } from '@ploutizo/types';
import { fetchPreparedImport } from './fetchPreparedImport';
import { importPreparedQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const useGetPreparedImport = (
  draftId: string
): UseQueryResult<ImportPreparedConfirmation> =>
  useQuery({
    queryKey: importPreparedQueryKey(draftId),
    queryFn: () => fetchPreparedImport(draftId),
    retry: false,
  });
