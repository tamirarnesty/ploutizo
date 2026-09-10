import { useEffect, useState } from 'react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import type { ImportReviewAutosaveStatus } from '@/lib/data-access/imports';

export const IMPORT_REVIEW_CONTINUE_HINT_ID = 'import-review-continue-hint';

export const IMPORT_REVIEW_CONTINUE_DEFAULT_HINT =
  'Continue prepares the selected rows for finalize import.';

const SAVED_ACK_MS = 2000;

interface ImportReviewContinueHintProps {
  autosaveStatus: ImportReviewAutosaveStatus;
  continueBlocker: string | null;
  isContinuing: boolean;
  onRetryAutosave: () => void;
}

export const ImportReviewContinueHint = ({
  autosaveStatus,
  continueBlocker,
  isContinuing,
  onRetryAutosave,
}: ImportReviewContinueHintProps) => {
  const [showSavedAck, setShowSavedAck] = useState(false);

  useEffect(() => {
    if (autosaveStatus !== 'saved') {
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
  }, [autosaveStatus]);

  if (isContinuing) {
    return (
      <Text
        id={IMPORT_REVIEW_CONTINUE_HINT_ID}
        variant="body-sm"
        className="max-w-sm text-right text-muted-foreground"
        aria-live="polite"
      >
        Preparing import…
      </Text>
    );
  }

  if (autosaveStatus === 'saving') {
    return (
      <Text
        id={IMPORT_REVIEW_CONTINUE_HINT_ID}
        variant="body-sm"
        className="max-w-sm text-right text-muted-foreground"
        aria-live="polite"
      >
        Saving…
      </Text>
    );
  }

  if (autosaveStatus === 'failed') {
    return (
      <div
        id={IMPORT_REVIEW_CONTINUE_HINT_ID}
        className="flex max-w-sm items-center justify-end gap-2"
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
    );
  }

  if (showSavedAck) {
    return (
      <Text
        id={IMPORT_REVIEW_CONTINUE_HINT_ID}
        variant="body-sm"
        className="max-w-sm text-right text-muted-foreground"
        aria-live="polite"
      >
        Saved
      </Text>
    );
  }

  return (
    <Text
      id={IMPORT_REVIEW_CONTINUE_HINT_ID}
      variant="body-sm"
      className="max-w-sm text-right text-muted-foreground"
    >
      {continueBlocker ?? IMPORT_REVIEW_CONTINUE_DEFAULT_HINT}
    </Text>
  );
};
