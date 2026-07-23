import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import type { ImportReviewAutosaveStatus } from '@/lib/data-access/imports';

interface ImportReviewAutosaveStripProps {
  status: ImportReviewAutosaveStatus;
  onRetry: () => void;
}

export const ImportReviewAutosaveStrip = ({
  status,
  onRetry,
}: ImportReviewAutosaveStripProps) => {
  if (status === 'idle') return null;

  if (status === 'saving') {
    return (
      <Text
        variant="body-sm"
        className="text-muted-foreground"
        aria-live="polite"
      >
        Saving…
      </Text>
    );
  }

  if (status === 'saved') {
    return (
      <Text
        variant="body-sm"
        className="text-muted-foreground"
        aria-live="polite"
      >
        Saved
      </Text>
    );
  }

  return (
    <div className="flex items-center gap-2" aria-live="assertive">
      <Text variant="body-sm" className="text-destructive">
        Failed
      </Text>
      <Button type="button" variant="link" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
};
