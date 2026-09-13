import { useEffect, useState } from 'react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import type { ImportReviewAutosaveStatus as ImportReviewAutosaveStatusValue } from '@/lib/data-access/imports';

export const IMPORT_REVIEW_AUTOSAVE_STATUS_ID = 'import-review-autosave-status';

const SAVED_ACK_MS = 2000;

interface ImportReviewAutosaveStatusProps {
  status: ImportReviewAutosaveStatusValue;
  onRetryAutosave: () => void;
}

export const ImportReviewAutosaveStatus = ({
  status,
  onRetryAutosave,
}: ImportReviewAutosaveStatusProps) => {
  const [showSavedAck, setShowSavedAck] = useState(false);

  useEffect(() => {
    if (status !== 'saved') {
      setShowSavedAck(false);
      return;
    }

    setShowSavedAck(true);
    const timer = window.setTimeout(() => {
      setShowSavedAck(false);
    }, SAVED_ACK_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [status]);

  const isSaving = status === 'saving';
  const isFailed = status === 'failed';
  const hasStatus = isSaving || isFailed || showSavedAck;

  return (
    <div
      className="flex min-h-5 min-w-32 items-center justify-end"
      aria-hidden={!hasStatus}
    >
      {isSaving ? (
        <Text
          id={IMPORT_REVIEW_AUTOSAVE_STATUS_ID}
          variant="body-sm"
          className="text-muted-foreground"
          aria-live="polite"
        >
          Saving…
        </Text>
      ) : null}
      {isFailed ? (
        <div
          id={IMPORT_REVIEW_AUTOSAVE_STATUS_ID}
          className="flex items-center justify-end gap-2"
          aria-live="assertive"
        >
          <Text variant="body-sm" className="text-destructive">
            Save failed
          </Text>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={onRetryAutosave}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {showSavedAck ? (
        <Text
          id={IMPORT_REVIEW_AUTOSAVE_STATUS_ID}
          variant="body-sm"
          className="text-muted-foreground"
          aria-live="polite"
        >
          Saved
        </Text>
      ) : null}
    </div>
  );
};
