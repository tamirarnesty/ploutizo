import { canContinueImportReview } from '@ploutizo/utils/import-row-readiness';
import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
import type {
  ImportDraftMeta,
  ImportReviewAutosaveStatus,
} from '@/lib/data-access/imports';

interface GetImportReviewContinueEnabledOptions {
  meta: ImportDraftMeta | undefined;
  rows: readonly ImportDraftRow[];
  orgMembers: readonly OrgMember[];
  autosaveStatus: ImportReviewAutosaveStatus;
  isContinuing: boolean;
}

export const getImportReviewContinueEnabled = ({
  meta,
  rows,
  orgMembers,
  autosaveStatus,
  isContinuing,
}: GetImportReviewContinueEnabledOptions): boolean => {
  if (!meta || isContinuing) return false;

  const validAssigneeMemberIds = new Set(orgMembers.map((member) => member.id));
  const continueOptions =
    orgMembers.length > 0 ? { validAssigneeMemberIds } : undefined;
  const persistenceBlocked =
    autosaveStatus === 'failed' || autosaveStatus === 'saving';

  return canContinueImportReview(rows, continueOptions) && !persistenceBlocked;
};
