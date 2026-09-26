import { useEffect } from 'react';
import { toast } from '@ploutizo/ui/components/sonner';
import { subscribeImportReviewAutosaveFailure } from '@/lib/data-access/imports/importReviewAutosave';

export const IMPORT_REVIEW_AUTOSAVE_FAILED_TOAST_ID =
  'import-review-autosave-failed';

interface UseImportReviewAutosaveFailureToastOptions {
  draftId: string;
  retryAutosave: () => void;
}

export const useImportReviewAutosaveFailureToast = ({
  draftId,
  retryAutosave,
}: UseImportReviewAutosaveFailureToastOptions) => {
  useEffect(() => {
    return subscribeImportReviewAutosaveFailure(draftId, () => {
      toast.error('Could not save changes.', {
        id: IMPORT_REVIEW_AUTOSAVE_FAILED_TOAST_ID,
        action: {
          label: 'Retry',
          onClick: () => {
            retryAutosave();
          },
        },
      });
    });
  }, [draftId, retryAutosave]);
};
