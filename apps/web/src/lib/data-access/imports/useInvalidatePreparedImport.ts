import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { fetchInvalidatePreparedImport } from './fetchInvalidatePreparedImport';
import { importPreparedQueryKey } from './queryKeys';

export const useInvalidatePreparedImport = (draftId: string) => {
  const access = useActiveHouseholdAccess();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchInvalidatePreparedImport(draftId),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: importPreparedQueryKey(access, draftId),
      });
    },
  });
};
