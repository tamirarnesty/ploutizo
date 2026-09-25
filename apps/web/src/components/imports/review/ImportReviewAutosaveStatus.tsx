import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@ploutizo/ui/lib/utils';
import type { ImportReviewAutosaveStatus as ImportReviewAutosaveStatusValue } from '@/lib/data-access/imports';

export const IMPORT_REVIEW_AUTOSAVE_STATUS_ID = 'import-review-autosave-status';

const SAVED_ACK_MS = 2000;

interface ImportReviewAutosaveStatusProps {
  status: ImportReviewAutosaveStatusValue;
}

export const ImportReviewAutosaveStatus = ({
  status,
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
      id={IMPORT_REVIEW_AUTOSAVE_STATUS_ID}
      className="flex size-9 shrink-0 items-center justify-center"
      aria-hidden={!hasStatus}
      aria-live={isFailed ? 'assertive' : 'polite'}
    >
      {isSaving ? (
        <Loader2
          className="size-4 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      ) : null}
      {isFailed ? (
        <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
      ) : null}
      {showSavedAck ? (
        <CheckCircle2
          className={cn('size-4 text-emerald-600 dark:text-emerald-400')}
          aria-hidden="true"
        />
      ) : null}
      {isSaving ? <span className="sr-only">Saving changes</span> : null}
      {isFailed ? <span className="sr-only">Save failed</span> : null}
      {showSavedAck ? <span className="sr-only">Saved</span> : null}
    </div>
  );
};
