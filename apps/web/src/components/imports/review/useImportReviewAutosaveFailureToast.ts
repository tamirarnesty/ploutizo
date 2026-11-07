import { useEffect } from 'react';
import { toast } from '@ploutizo/ui/components/sonner-api';
import { getReviewPersistence } from '@/lib/data-access/imports/reviewPersistence';
import { useImportReviewAutosaveStatus } from '@/lib/data-access/imports/useImportReviewAutosave';

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
  const status = useImportReviewAutosaveStatus(draftId);

  useEffect(() => {
    const persistence = getReviewPersistence(draftId);
    let lastStatus = persistence.getSnapshot().status;
    const unsubscribe = persistence.subscribe(() => {
      const { status: nextStatus } = persistence.getSnapshot();
      if (nextStatus === 'failed' && lastStatus !== 'failed') {
        toast.error(
          'Could not save changes. Check your connection and retry.',
          {
            id: IMPORT_REVIEW_AUTOSAVE_FAILED_TOAST_ID,
            duration: Infinity,
            action: {
              label: 'Retry',
              onClick: () => {
                retryAutosave();
              },
            },
          }
        );
      }
      lastStatus = nextStatus;
    });
    return () => {
      unsubscribe();
      toast.dismiss(IMPORT_REVIEW_AUTOSAVE_FAILED_TOAST_ID);
    };
  }, [draftId, retryAutosave]);

  useEffect(() => {
    if (status === 'saved') {
      toast.dismiss(IMPORT_REVIEW_AUTOSAVE_FAILED_TOAST_ID);
    }
  }, [status]);
};
