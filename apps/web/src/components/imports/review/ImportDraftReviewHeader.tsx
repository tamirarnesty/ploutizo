import { Button } from '@ploutizo/ui/components/button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportReviewRow } from '@ploutizo/types';
import { PageHeader } from '@/components/PageHeader';
import type { ImportDraftMeta } from '@/lib/data-access/imports';
import { useImportReviewAutosaveStatus } from '@/lib/data-access/imports/useImportReviewAutosave';
import { ImportDiscardDraftAction } from '../lib/ImportDiscardDraftAction';
import { formatImportDraftReviewSubtitle } from '../lib/importPresentation';
import { ImportReviewAutosaveStatus } from './ImportReviewAutosaveStatus';
import type { ImportDiscardDraftActionProps } from '../lib/ImportDiscardDraftAction';

interface ImportDraftReviewHeaderProps {
  meta?: ImportDraftMeta;
  rows?: ImportReviewRow[];
  isLoading?: boolean;
  isContinuing: boolean;
  onContinue: () => void | Promise<void>;
  discard?: ImportDiscardDraftActionProps;
  discardInProgress?: boolean;
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
  discard,
  discardInProgress = false,
}: ImportDraftReviewHeaderProps) => {
  const draftId = meta?.id ?? '';
  const autosaveStatus = useImportReviewAutosaveStatus(draftId);
  const iconStatus = meta ? autosaveStatus : 'idle';

  return (
    <PageHeader
      title={
        meta ? (
          formatAccountLabel(meta.account)
        ) : (
          <Skeleton className="h-7 w-48" />
        )
      }
      description={
        meta ? (
          formatImportDraftReviewSubtitle(toLiveSubtitleMeta(meta, rows))
        ) : (
          <Skeleton className="h-4 w-56" />
        )
      }
      actions={
        <>
          <ImportReviewAutosaveStatus status={iconStatus} />
          {isLoading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <>
              {discard ? (
                <ImportDiscardDraftAction
                  discardingThisDraft={discard.discardingThisDraft}
                  disabled={discard.disabled}
                  onDiscard={discard.onDiscard}
                />
              ) : null}
              <Button
                disabled={!meta || isContinuing || discardInProgress}
                type="button"
                onClick={() => {
                  void onContinue();
                }}
              >
                {isContinuing ? 'Preparing…' : 'Continue'}
              </Button>
            </>
          )}
        </>
      }
    />
  );
};
