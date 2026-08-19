import { useMutation } from '@tanstack/react-query';
import { toast } from '@ploutizo/ui/components/sonner';
import type { ImportPreparedSet } from '@ploutizo/types';
import type { ApiErrorBody } from '@/lib/queryClient';
import { fetchContinueImportDraft } from './fetchContinueImportDraft';

export const useContinueImportDraft = (draftId: string) =>
  useMutation<ImportPreparedSet, ApiErrorBody, void>({
    mutationFn: () => fetchContinueImportDraft(draftId),
    onSuccess: (preparedSet) => {
      toast.success(`Prepared revision ${preparedSet.revision} for finalize.`);
    },
  });
