import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInvalidatePreparedImport } from './fetchInvalidatePreparedImport';
import { importPreparedQueryKey } from './queryKeys';

export const useInvalidatePreparedImport = (draftId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchInvalidatePreparedImport(draftId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: importPreparedQueryKey(draftId) });
    },
  });
};
