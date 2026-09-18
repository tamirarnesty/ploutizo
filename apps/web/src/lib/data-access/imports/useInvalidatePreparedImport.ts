import { useQueryClient } from '@tanstack/react-query';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { fetchInvalidatePreparedImport } from './fetchInvalidatePreparedImport';
import { importPreparedQueryKey } from './queryKeys';

export const useInvalidatePreparedImport = (draftId: string) => {
  const queryClient = useQueryClient();
  return useHouseholdMutation({
    mutationFn: () => fetchInvalidatePreparedImport(draftId),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: importPreparedQueryKey(draftId),
      });
    },
  });
};
