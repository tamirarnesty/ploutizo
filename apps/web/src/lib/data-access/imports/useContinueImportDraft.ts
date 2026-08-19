import { useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@ploutizo/ui/components/sonner';
import type { ImportPreparedSet } from '@ploutizo/types';
import type { ApiErrorBody } from '@/lib/queryClient';
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

  const mutation = useMutation<
    ImportPreparedSet,
    ApiErrorBody | ObsoleteContinueError,
    void
  >({
    mutationFn: async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      const generation = generationRef.current;
      try {
        const preparedSet = await fetchContinueImportDraft(
          draftId,
          controller.signal
        );
        if (generation !== generationRef.current) {
          throw new ObsoleteContinueError();
        }
        return preparedSet;
      } catch (error) {
        if (generation !== generationRef.current) {
          throw new ObsoleteContinueError();
        }
        throw error;
      }
    },
    onSuccess: (preparedSet) => {
      toast.success(`Prepared revision ${preparedSet.revision} for finalize.`);
    },
  });

  const reset = useCallback(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    mutation.reset();
  }, [mutation.reset]);

  return {
    ...withoutObsoleteMutationState(mutation),
    reset,
  };
};
