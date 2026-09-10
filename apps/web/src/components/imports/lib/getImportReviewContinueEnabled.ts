import { canContinueImportReview } from '@ploutizo/utils/import-row-readiness';
import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
import type {
  ImportDraftMeta,
  ImportReviewAutosaveStatus,
} from '@/lib/data-access/imports';

export const getImportReviewContinueEnabled = (
  meta: ImportDraftMeta | undefined,
  rows: readonly ImportDraftRow[],
  orgMembers: readonly OrgMember[],
  autosaveStatus: ImportReviewAutosaveStatus,
  isContinuing: boolean
): boolean => {
  if (!meta || isContinuing) return false;

  const validAssigneeMemberIds = new Set(orgMembers.map((member) => member.id));
  const continueOptions =
    orgMembers.length > 0 ? { validAssigneeMemberIds } : undefined;
  const persistenceBlocked =
    autosaveStatus === 'failed' || autosaveStatus === 'saving';

  return canContinueImportReview(rows, continueOptions) && !persistenceBlocked;
};
