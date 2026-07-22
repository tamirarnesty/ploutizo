import { formatAccountLabel } from '@ploutizo/utils';
import { getLiveAssigneeMemberIds } from '@ploutizo/utils/import-row-readiness';
import {
  getImportRowReviewBlockers,
  resolveImportRowReviewDescription,
} from '@ploutizo/utils/import-row-status';
import type { ImportRowReviewBlocker } from '@ploutizo/utils/import-row-status';
import type {
  ImportBatchStatus,
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
  OrgMember,
} from '@ploutizo/types';

export const getImportRowLabel = (row: ImportDraftRow): string =>
  resolveImportRowReviewDescription(row) ??
  row.sourceDescription?.trim() ??
  'import row';

export const formatDraftAccountLabel = (
  draft: ImportDraftSummary | ImportDraft
): string =>
  formatAccountLabel({
    name: draft.accountName,
    institution: draft.accountInstitution,
    lastFour: draft.accountLastFour,
  });

const IMPORT_BATCH_STATUS_LABELS: Record<ImportBatchStatus, string> = {
  draft: 'Draft',
  completed: 'Completed',
  discarded: 'Discarded',
};

export const formatImportBatchStatusLabel = (
  status: ImportBatchStatus
): string => IMPORT_BATCH_STATUS_LABELS[status];

export const importBatchStatusVariant = (
  status: ImportBatchStatus
): 'destructive' | 'secondary' | 'default' | 'outline' | undefined => {
  if (status === 'completed') return 'outline';
  if (status === 'discarded') return 'secondary';
  return 'secondary';
};

export const resolveImportRowOriginalDescription = (
  row: ImportDraftRow
): string | null => {
  const original = row.sourceDescription ?? row.parsedDescription;
  const trimmed = original?.trim();
  return trimmed ? trimmed : null;
};

const IMPORT_ROW_MISSING_BLOCKER_LABELS: Record<
  Exclude<ImportRowReviewBlocker, 'settlement'>,
  string
> = {
  date: 'date',
  amount: 'amount',
  description: 'description',
  type: 'type',
  category: 'category',
  assignee: 'assignee',
};

export const getImportRowStatusTooltip = (row: ImportDraftRow): string => {
  switch (row.status) {
    case 'ready':
      return 'Ready to import';
    case 'needs_review': {
      const blockers = getImportRowReviewBlockers(row);
      if (blockers.length === 0) return 'Needs review';

      const requiresSettlement = blockers.includes('settlement');
      const missingLabels = blockers
        .filter(
          (blocker): blocker is Exclude<ImportRowReviewBlocker, 'settlement'> =>
            blocker !== 'settlement'
        )
        .map((blocker) => IMPORT_ROW_MISSING_BLOCKER_LABELS[blocker]);

      const parts: string[] = [];
      if (requiresSettlement) parts.push('settlement requires review');
      if (missingLabels.length > 0) {
        parts.push(`missing ${missingLabels.join(', ')}`);
      }
      return `Needs review: ${parts.join('; ')}`;
    }
    case 'invalid':
      return row.invalidReason ?? 'Invalid row';
    case 'skipped':
      return 'Skipped and will not import';
    default:
      return row.status;
  }
};

export const shouldDefaultExpandImportRow = (row: ImportDraftRow): boolean => {
  if (row.reviewNotes?.trim()) return true;
  if (row.reviewTagIds.length > 0) return true;
  if (row.invalidReason) return true;
  if (row.status === 'needs_review' || row.status === 'invalid') return true;
  return false;
};

export const resolveImportRowAssigneeMemberIds = (
  row: ImportDraftRow,
  orgMembers: OrgMember[]
): string[] =>
  getLiveAssigneeMemberIds(
    row.reviewAssigneeMemberIds,
    new Set(orgMembers.map((member) => member.id))
  );

export const formatImportDraftReviewSubtitle = (
  draft: ImportDraftSummary | ImportDraft
): string => {
  const parts = [draft.fileName?.trim() || 'Untitled CSV'];
  const transactionLabel =
    draft.rowCount === 1 ? '1 transaction' : `${draft.rowCount} transactions`;
  parts.push(transactionLabel);

  if (draft.invalidRowCount > 0) {
    const invalidLabel =
      draft.invalidRowCount === 1
        ? '1 invalid'
        : `${draft.invalidRowCount} invalid`;
    parts.push(invalidLabel);
  }

  return parts.join(' · ');
};
