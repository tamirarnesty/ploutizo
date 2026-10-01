import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { toast } from '@ploutizo/ui/components/sonner';
import type { ImportCompletedResult } from '@ploutizo/validators';
import type { ImportOutcomeCounts } from '@ploutizo/types';
import { invalidateSpendQueries } from '@/lib/data-access/invalidateSpendQueries';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import type { ApiErrorBody, ApiResponseContractError } from '@/lib/queryClient';
import { cancelImportDraftQueryFetches } from './cancelImportDraftQueryFetches';
import { fetchFinalizeImportDraft } from './fetchFinalizeImportDraft';
import { classifyImportFinalizeError } from './importFinalizeOutcome';
import {
  importFinalizePendingMessage,
  importFinalizeToastId,
} from './importFinalizeToast';
import { releaseImportDraftSession } from './releaseImportDraftSession';
import {
  activeImportDraftsQueryKey,
  importFinalizeMutationKey,
  importHistoryQueryKey,
} from './queryKeys';

export { importFinalizeMutationKey };

export type FinalizeImportVariables = {
  rowIds: string[];
  counts: ImportOutcomeCounts;
};

export type UseFinalizeImportDraftOptions = {
  /** Finalize page: toast Retry should run the same handler as the primary action. */
  onUncertainFailureRetry?: () => void;
};

const importCompletedViewOutcome = (
  result: ImportCompletedResult
): 'created' | 'matched' | null =>
  result.createdCount > 0
    ? 'created'
    : result.matchedCount > 0
      ? 'matched'
      : null;

export const useFinalizeImportDraft = (
  draftId: string,
  options?: UseFinalizeImportDraftOptions
) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const toastId = importFinalizeToastId(draftId);
  const uncertainFailureRetryRef = useRef(options?.onUncertainFailureRetry);
  uncertainFailureRetryRef.current = options?.onUncertainFailureRetry;

  const mutation = useHouseholdMutation<
    ImportCompletedResult,
    ApiErrorBody | ApiResponseContractError,
    FinalizeImportVariables
  >({
    mutationKey: importFinalizeMutationKey(draftId),
    mutationFn: ({ rowIds }) => fetchFinalizeImportDraft(draftId, rowIds),
    onMutate: async (variables) => {
      await cancelImportDraftQueryFetches(draftId);
      toast.loading(importFinalizePendingMessage(variables.counts), {
        id: toastId,
      });
    },
    onSuccess: async (result) => {
      await releaseImportDraftSession(draftId);
      void queryClient.invalidateQueries({
        queryKey: activeImportDraftsQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: importHistoryQueryKey,
      });
      invalidateSpendQueries(queryClient);

      const viewOutcome = importCompletedViewOutcome(result);
      toast.success('Import completed.', {
        id: toastId,
        action: viewOutcome
          ? {
              label: 'View transactions',
              onClick: () => {
                void router.navigate({
                  to: '/transactions',
                  search: {
                    importBatchId: result.id,
                    importOutcome: viewOutcome,
                  },
                });
              },
            }
          : undefined,
      });
    },
    onError: (error, variables) => {
      const outcome = classifyImportFinalizeError(error);
      if (outcome === 'return-to-review' || outcome === 'not-found') {
        toast.dismiss(toastId);
        return;
      }

      toast.error("Couldn't confirm the import finished.", {
        id: toastId,
        description: "Retry is safe — a finished import won't be duplicated.",
        action: {
          label: 'Retry',
          onClick: () => {
            const retry = uncertainFailureRetryRef.current;
            if (retry) {
              retry();
              return;
            }
            mutation.mutate(variables);
          },
        },
      });
    },
  });

  return mutation;
};
