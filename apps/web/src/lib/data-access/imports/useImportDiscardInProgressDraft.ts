import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useDiscardImportDraft } from './useDiscardImportDraft';

type UseImportDiscardInProgressDraftOptions = {
  /** Runs after the server discard succeeds, before navigating to the hub. */
  onDiscardSuccess?: () => void;
};

export const useImportDiscardInProgressDraft = (
  draftId: string,
  options?: UseImportDiscardInProgressDraftOptions
) => {
  const navigate = useNavigate();
  const discardDraft = useDiscardImportDraft();
  const onDiscardSuccess = options?.onDiscardSuccess;

  const discard = useCallback(() => {
    discardDraft.mutate(draftId, {
      onSuccess: () => {
        onDiscardSuccess?.();
        void navigate({ to: '/import', ignoreBlocker: true });
      },
    });
  }, [discardDraft, draftId, navigate, onDiscardSuccess]);

  const discardingThisDraft =
    discardDraft.isPending && discardDraft.variables === draftId;

  return {
    discard,
    discardingThisDraft,
  };
};
