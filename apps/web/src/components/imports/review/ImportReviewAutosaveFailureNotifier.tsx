import { useImportReviewAutosaveFailureToast } from './useImportReviewAutosaveFailureToast';

interface ImportReviewAutosaveFailureNotifierProps {
  draftId: string;
  retryAutosave: () => void;
}

/** Headless failure toast so autosave subscriptions do not re-render the review grid. */
export const ImportReviewAutosaveFailureNotifier = ({
  draftId,
  retryAutosave,
}: ImportReviewAutosaveFailureNotifierProps) => {
  useImportReviewAutosaveFailureToast({ draftId, retryAutosave });
  return null;
};
