import { useQuery } from '@tanstack/react-query';
import type { ImportPreparedConfirmation } from '@ploutizo/types';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { fetchPreparedImport } from './fetchPreparedImport';
import { importPreparedQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const useGetPreparedImport = (
  draftId: string
): UseQueryResult<ImportPreparedConfirmation> => {
  const access = useActiveHouseholdAccess();
  return useQuery({
    queryKey: importPreparedQueryKey(access, draftId),
    queryFn: () => fetchPreparedImport(draftId),
    retry: false,
  });
};
