import { Button } from '@ploutizo/ui/components/button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import {
  formatAccountLabel,
  formatInstitutionMismatchWarning,
} from '@ploutizo/utils';
import type { ImportDraftRow } from '@ploutizo/types';
import type {
  ImportDraftMeta,
  ImportReviewAutosaveStatus,
} from '@/lib/data-access/imports';
import { formatImportDraftReviewSubtitle } from '../lib/importPresentation';
import { ImportReviewAutosaveStrip } from './ImportReviewAutosaveStrip';

interface ImportDraftReviewHeaderProps {
  meta?: ImportDraftMeta;
  rows?: ImportDraftRow[];
  isLoading?: boolean;
  canContinue: boolean;
  continueBlocker: string | null;
  continueError: string | null;
  isContinuing: boolean;
  autosaveStatus: ImportReviewAutosaveStatus;
  onRetryAutosave: () => void;
  onContinue: () => void | Promise<void>;
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
  canContinue,
  continueBlocker,
  continueError,
  isContinuing,
  autosaveStatus,
  onRetryAutosave,
  onContinue,
}: ImportDraftReviewHeaderProps) => {
  const continueButton = (
    <Button
      disabled={!canContinue || isContinuing}
      type="button"
      onClick={() => {
        void onContinue();
      }}
    >
      {isContinuing ? 'Preparing…' : 'Continue'}
    </Button>
  );

  const tooltipContent = continueError ?? continueBlocker;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {meta ? (
          <>
            <Text as="h2" variant="h3" className="truncate">
              {formatAccountLabel(meta.account)}
            </Text>
            <Text variant="body-sm" className="truncate text-muted-foreground">
              {formatImportDraftReviewSubtitle(toLiveSubtitleMeta(meta, rows))}
            </Text>
            {meta.institutionMismatch ? (
              <Text
                variant="body-sm"
                className="mt-1 text-amber-700 dark:text-amber-400"
              >
                {formatInstitutionMismatchWarning(meta.institutionMismatch)}
              </Text>
            ) : null}
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
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <Tooltip disabled={!tooltipContent}>
            <TooltipTrigger render={continueButton} />
            <TooltipContent>{tooltipContent}</TooltipContent>
          </Tooltip>
        )}
        {meta ? (
          <Text
            variant="body-sm"
            className="max-w-sm text-right text-muted-foreground"
          >
            Continue prepares the selected rows for finalize import.
          </Text>
        ) : null}
      </div>
    </div>
  );
};
