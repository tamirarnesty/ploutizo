import { Button } from '@ploutizo/ui/components/button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportReviewRow } from '@ploutizo/types';
import type { ImportDraftMeta } from '@/lib/data-access/imports';
import { useImportReviewAutosaveStatus } from '@/lib/data-access/imports/useImportReviewAutosave';
import { formatImportDraftReviewSubtitle } from '../lib/importPresentation';
import { getImportReviewContinueEnabled } from '../lib/getImportReviewContinueEnabled';
import {
  IMPORT_REVIEW_AUTOSAVE_STATUS_ID,
  ImportReviewAutosaveStatus,
} from './ImportReviewAutosaveStatus';

interface ImportDraftReviewHeaderProps {
  meta?: ImportDraftMeta;
  rows?: ImportReviewRow[];
  isLoading?: boolean;
  isContinuing: boolean;
  onContinue: () => void | Promise<void>;
}

const toLiveSubtitleMeta = (
  meta: ImportDraftMeta,
  rows: ImportReviewRow[]
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
  isContinuing,
  onContinue,
}: ImportDraftReviewHeaderProps) => {
  const draftId = meta?.id ?? '';
  const autosaveStatus = useImportReviewAutosaveStatus(draftId);
  const iconStatus = meta ? autosaveStatus : 'idle';
  const continueEnabled = getImportReviewContinueEnabled({
    meta,
    rows,
    autosaveStatus,
    isContinuing,
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {meta ? (
          <>
            <Text as="h2" variant="h3" className="wrap-break-word">
              {formatAccountLabel(meta.account)}
            </Text>
            <Text
              variant="body-sm"
              className="wrap-break-word text-muted-foreground"
            >
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
      <div className="flex items-center gap-2">
        <ImportReviewAutosaveStatus status={iconStatus} />
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <Button
            disabled={!continueEnabled}
            type="button"
            aria-describedby={IMPORT_REVIEW_AUTOSAVE_STATUS_ID}
            onClick={() => {
              void onContinue();
            }}
          >
            {isContinuing ? 'Preparing…' : 'Continue'}
          </Button>
        )}
      </div>
    </div>
  );
};
