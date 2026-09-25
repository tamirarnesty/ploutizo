import { canContinueImportReview } from '@ploutizo/utils/import-row-readiness';
import type { ImportReviewRow } from '@ploutizo/types';
import type {
  ImportDraftMeta,
  ImportReviewAutosaveStatus,
} from '@/lib/data-access/imports';

interface GetImportReviewContinueEnabledOptions {
  meta: ImportDraftMeta | undefined;
  rows: readonly ImportReviewRow[];
  autosaveStatus: ImportReviewAutosaveStatus;
  isContinuing: boolean;
}

export const getImportReviewContinueEnabled = ({
  meta,
  rows,
  autosaveStatus,
  isContinuing,
}: GetImportReviewContinueEnabledOptions): boolean => {
  if (!meta || isContinuing) return false;

  const persistenceBlocked =
    autosaveStatus === 'failed' || autosaveStatus === 'saving';

  return canContinueImportReview(rows) && !persistenceBlocked;
};
