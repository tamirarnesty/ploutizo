import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useDiscardImportDraft } from './useDiscardImportDraft';

export const useImportDiscardInProgressDraft = (draftId: string) => {
  const navigate = useNavigate();
  const discardDraft = useDiscardImportDraft();

  const discard = useCallback(() => {
    discardDraft.mutate(draftId, {
      onSuccess: () => {
        void navigate({ to: '/import', ignoreBlocker: true });
      },
    });
  }, [discardDraft, draftId, navigate]);

  const discardingThisDraft =
    discardDraft.isPending && discardDraft.variables === draftId;

  return {
    discard,
    discardingThisDraft,
  };
};
