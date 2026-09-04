import type { ImportDraft, MatchTargetFact } from '@ploutizo/types';
import { queryClient } from '@/lib/queryClient';
import { importDraftQueryKey } from './queryKeys';

export const mergeImportDraftMatchTargetFacts = (
  draftId: string,
  merge: Record<string, MatchTargetFact>
) => {
  queryClient.setQueryData<ImportDraft>(
    importDraftQueryKey(draftId),
    (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        matchTargetFacts: { ...prev.matchTargetFacts, ...merge },
      };
    }
  );
};
