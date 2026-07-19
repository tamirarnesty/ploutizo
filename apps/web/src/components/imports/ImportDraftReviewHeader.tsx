import { Button } from '@ploutizo/ui/components/button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import type { ImportDraftRow } from '@ploutizo/types';
import type {
  ImportDraftMeta,
  ImportReviewAutosaveStatus,
} from '@/lib/data-access/imports';
import {
  formatDraftAccountLabel,
  formatImportDraftReviewSubtitle,
} from './importPresentation';
import { ImportReviewAutosaveStrip } from './ImportReviewAutosaveStrip';

const IMPORT_COMMIT_PREVIEW_COPY = 'Import commit coming soon';

interface ImportDraftReviewHeaderProps {
  meta?: ImportDraftMeta;
  rows?: ImportDraftRow[];
  isLoading?: boolean;
  canContinue: boolean;
  continueBlocker: string | null;
  autosaveStatus: ImportReviewAutosaveStatus;
  onRetryAutosave: () => void;
  onContinue: () => void;
}

const toLiveSubtitleMeta = (
  meta: ImportDraftMeta,
  rows: ImportDraftRow[]
): ImportDraftMeta => ({
  ...meta,
  rowCount: rows.length,
  invalidRowCount: rows.filter((row) => row.status === 'invalid').length,
  validRowCount: rows.filter((row) => row.status !== 'invalid').length,
});

export const ImportDraftReviewHeader = ({
  meta,
  rows = [],
  isLoading = false,
  canContinue: _canContinue,
  continueBlocker,
  autosaveStatus,
  onRetryAutosave,
  onContinue,
}: ImportDraftReviewHeaderProps) => {
  // Finalize remains product-disabled (ADR 0004); onContinue is the flush gate seam.
  const continueButton = (
    <Button disabled type="button" onClick={onContinue}>
      Continue
    </Button>
  );

  const tooltipContent = continueBlocker
    ? `${continueBlocker} ${IMPORT_COMMIT_PREVIEW_COPY}.`
    : IMPORT_COMMIT_PREVIEW_COPY;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {meta ? (
          <>
            <Text as="h2" variant="h3" className="truncate">
              {formatDraftAccountLabel(meta)}
            </Text>
            <Text variant="body-sm" className="truncate text-muted-foreground">
              {formatImportDraftReviewSubtitle(toLiveSubtitleMeta(meta, rows))}
            </Text>
          </>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <ImportReviewAutosaveStrip
          status={autosaveStatus}
          onRetry={onRetryAutosave}
        />
        {meta ? (
          <Tooltip>
            <TooltipTrigger render={continueButton} />
            <TooltipContent>{tooltipContent}</TooltipContent>
          </Tooltip>
        ) : isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          continueButton
        )}
        {meta ? (
          <Text
            variant="body-sm"
            className="max-w-sm text-right text-muted-foreground"
          >
            {IMPORT_COMMIT_PREVIEW_COPY}
          </Text>
        ) : null}
      </div>
    </div>
  );
};
