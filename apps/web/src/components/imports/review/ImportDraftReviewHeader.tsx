import { Button } from '@ploutizo/ui/components/button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
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
  rows?: ImportDraftRow[];
  orgMembers?: OrgMember[];
  isLoading?: boolean;
  isContinuing: boolean;
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
  orgMembers = [],
  isLoading = false,
  isContinuing,
  onRetryAutosave,
  onContinue,
}: ImportDraftReviewHeaderProps) => {
  const draftId = meta?.id ?? '';
  const autosaveStatus = useImportReviewAutosaveStatus(draftId);
  const continueEnabled = getImportReviewContinueEnabled(
    meta,
    rows,
    orgMembers,
    autosaveStatus,
    isContinuing
  );

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
        {meta ? (
          <ImportReviewAutosaveStatus
            status={autosaveStatus}
            onRetryAutosave={onRetryAutosave}
          />
        ) : (
          <div className="min-h-5 min-w-32" aria-hidden />
        )}
      </div>
    </div>
  );
};
