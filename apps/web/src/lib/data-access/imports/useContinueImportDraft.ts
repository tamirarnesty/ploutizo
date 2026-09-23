import { useCallback, useRef } from 'react';
import type { ImportFinalizePreview } from '@ploutizo/types';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import type { ApiErrorBody } from '@/lib/queryClient';
import {
  getImportReviewAutosaveSnapshot,
  subscribeImportReviewAutosave,
} from './importReviewAutosave';
import { fetchContinueImportDraft } from './fetchContinueImportDraft';
import type { UseMutationResult } from '@tanstack/react-query';

class ObsoleteContinueError extends Error {
  constructor() {
    super('Continue request is obsolete.');
    this.name = 'ObsoleteContinueError';
  }
}

const isObsoleteContinueError = (
  error: unknown
): error is ObsoleteContinueError => error instanceof ObsoleteContinueError;

const withoutObsoleteMutationState = <TData, TError, TVariables, TContext>(
  mutation: UseMutationResult<TData, TError, TVariables, TContext>
) => ({
  ...mutation,
  error: isObsoleteContinueError(mutation.error) ? null : mutation.error,
  isError: isObsoleteContinueError(mutation.error) ? false : mutation.isError,
});

export const useContinueImportDraft = (draftId: string) => {
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const invalidateInFlightContinue = useCallback(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
  }, []);

  const mutation = useHouseholdMutation<
    ImportFinalizePreview,
    ApiErrorBody | ObsoleteContinueError,
    { rowIds: string[] }
  >({
    mutationFn: async ({ rowIds }) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const generation = generationRef.current;
      const abortIfReviewSaving = () => {
        const autosaveStatus = getImportReviewAutosaveSnapshot(draftId).status;
        if (autosaveStatus === 'saving' || autosaveStatus === 'pending') {
          invalidateInFlightContinue();
        }
      };
      const unsubscribeAutosave = subscribeImportReviewAutosave(
        draftId,
        abortIfReviewSaving
      );

      try {
        const preview = await fetchContinueImportDraft(
          draftId,
          rowIds,
          controller.signal
        );
        if (generation !== generationRef.current) {
          throw new ObsoleteContinueError();
        }
        return preview;
      } catch (error) {
        if (generation !== generationRef.current || controller.signal.aborted) {
          throw new ObsoleteContinueError();
        }
        throw error;
      } finally {
        unsubscribeAutosave();
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
  });

  const reset = useCallback(() => {
    invalidateInFlightContinue();
    mutation.reset();
  }, [invalidateInFlightContinue, mutation.reset]);

  const continueImport = useCallback(
    async (rowIds: string[]): Promise<ImportFinalizePreview | null> => {
      try {
        return await mutation.mutateAsync({ rowIds });
      } catch (error) {
        if (isObsoleteContinueError(error)) return null;
        throw error;
      }
    },
    [mutation.mutateAsync]
  );

  return {
    ...withoutObsoleteMutationState(mutation),
    continueImport,
    reset,
  };
};
