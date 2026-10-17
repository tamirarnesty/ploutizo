import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@ploutizo/ui/lib/utils';
import type { ImportReviewAutosaveStatus as ImportReviewAutosaveStatusValue } from '@/lib/data-access/imports';

const SAVED_ACK_MS = 2000;

const iconClassName =
  'absolute size-4 transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none';
const iconVisible = 'scale-100 opacity-100 blur-0';
const iconHidden = 'scale-25 opacity-0 blur-[4px]';

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

  return (
    <div
      role="status"
      className="relative flex size-9 shrink-0 items-center justify-center"
      aria-live={isFailed ? 'assertive' : 'polite'}
    >
      <Loader2
        className={cn(
          iconClassName,
          'animate-spin text-muted-foreground motion-reduce:animate-none',
          isSaving ? iconVisible : iconHidden
        )}
        aria-hidden="true"
      />
      <AlertCircle
        className={cn(
          iconClassName,
          'text-destructive',
          isFailed ? iconVisible : iconHidden
        )}
        aria-hidden="true"
      />
      <CheckCircle2
        className={cn(
          iconClassName,
          'text-success-foreground',
          showSavedAck ? iconVisible : iconHidden
        )}
        aria-hidden="true"
      />
      {isSaving ? <span className="sr-only">Saving changes</span> : null}
      {isFailed ? <span className="sr-only">Save failed</span> : null}
      {showSavedAck ? <span className="sr-only">Saved</span> : null}
    </div>
  );
};
