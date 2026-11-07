import { useCallback } from 'react';
import type { ImportFinalizePreview } from '@ploutizo/validators';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import type { ApiErrorBody, ApiResponseContractError } from '@/lib/queryClient';
import { fetchContinueImportDraft } from './fetchContinueImportDraft';
import { getReviewPersistence } from './reviewPersistence';

/**
 * Continue is obsolete once new review edits begin saving: its request is
 * aborted and resolves to `null` instead of surfacing an error.
 */
export const useContinueImportDraft = (draftId: string) => {
  const mutation = useHouseholdMutation<
    ImportFinalizePreview | null,
    ApiErrorBody | ApiResponseContractError,
    { rowIds: string[] }
  >({
    mutationFn: async ({ rowIds }) => {
      const signal = getReviewPersistence(draftId).signalUntilDirty();
      try {
        const preview = await fetchContinueImportDraft(draftId, rowIds, signal);
        return signal.aborted ? null : preview;
      } catch (error) {
        if (signal.aborted) return null;
        throw error;
      }
    },
  });

  const { mutateAsync } = mutation;
  const continueImport = useCallback(
    (rowIds: string[]) => mutateAsync({ rowIds }),
    [mutateAsync]
  );

  return { ...mutation, continueImport };
};
