import { Button } from '@ploutizo/ui/components/button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportDraftRow } from '@ploutizo/types';
import type {
  ImportDraftMeta,
  ImportReviewAutosaveStatus,
} from '@/lib/data-access/imports';
import { formatImportDraftReviewSubtitle } from '../lib/importPresentation';
import { ImportReviewAutosaveStrip } from './ImportReviewAutosaveStrip';

const IMPORT_COMMIT_PREVIEW_COPY = 'Import commit coming soon';
const REVIEW_PRODUCT_FLAGS: { finalizeEnabled: boolean } = {
  finalizeEnabled: false,
};

interface ImportDraftReviewHeaderProps {
  meta?: ImportDraftMeta;
  rows?: ImportDraftRow[];
  isLoading?: boolean;
  canContinue: boolean;
  continueBlocker: string | null;
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
  autosaveStatus,
  onRetryAutosave,
  onContinue,
}: ImportDraftReviewHeaderProps) => {
  const continueButton = (
    <Button
      disabled={!REVIEW_PRODUCT_FLAGS.finalizeEnabled || !canContinue}
      type="button"
      onClick={() => {
        void onContinue();
      }}
    >
      Continue
    </Button>
  );

  const tooltipContent = continueBlocker
    ? `${continueBlocker} ${IMPORT_COMMIT_PREVIEW_COPY}.`
    : null;

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
            {IMPORT_COMMIT_PREVIEW_COPY}
          </Text>
        ) : null}
      </div>
    </div>
  );
};
