import { useMutation } from '@tanstack/react-query';
import type { ImportPreparedSet } from '@ploutizo/types';
import { fetchContinueImportDraft } from './fetchContinueImportDraft';

export const useContinueImportDraft = (draftId: string) =>
  useMutation<ImportPreparedSet, unknown, void>({
    mutationFn: () => fetchContinueImportDraft(draftId),
  });
