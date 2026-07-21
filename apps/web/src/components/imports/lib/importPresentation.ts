import { formatAccountLabel } from '@ploutizo/utils';
import {
  getImportRowReviewBlockers,
  isImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import type { ImportRowReviewBlocker } from '@ploutizo/utils/import-row-status';
import type {
  ImportBatchStatus,
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
  ImportTransactionType,
  OrgMember,
} from '@ploutizo/types';

/** UI type display may fall back to raw sourceType; status derivation does not. */
export const resolveImportRowType = (
  row: ImportDraftRow
): ImportTransactionType | null =>
  row.reviewType ??
  row.parsedType ??
  (isImportTransactionType(row.sourceType) ? row.sourceType : null);

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

export const importStatusVariant = (status: ImportDraftRow['status']) => {
  if (status === 'invalid') return 'destructive' as const;
  if (status === 'ready') return 'outline' as const;
  return 'secondary' as const;
};

export const resolveImportRowOriginalDescription = (
  row: ImportDraftRow
): string | null => {
  const original = row.sourceDescription ?? row.parsedDescription;
  const trimmed = original?.trim();
  return trimmed ? trimmed : null;
};

const IMPORT_ROW_REVIEW_BLOCKER_LABELS: Record<ImportRowReviewBlocker, string> =
  {
    date: 'date',
    amount: 'amount',
    description: 'description',
    type: 'type',
    category: 'category',
    assignee: 'assignee',
    settlement: 'settlement review',
  };

export const formatImportRowReviewBlockers = (
  blockers: ImportRowReviewBlocker[]
): string[] =>
  blockers.map((blocker) => IMPORT_ROW_REVIEW_BLOCKER_LABELS[blocker]);

export const getImportRowStatusTooltip = (row: ImportDraftRow): string => {
  switch (row.status) {
    case 'ready':
      return 'Ready to import';
    case 'needs_review': {
      const blockers = formatImportRowReviewBlockers(
        getImportRowReviewBlockers(row)
      );
      if (blockers.length === 0) return 'Needs review';
      return `Needs review: missing ${blockers.join(', ')}`;
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
): string[] => {
  const validMemberIds = new Set(orgMembers.map((member) => member.id));
  return row.reviewAssigneeMemberIds.filter((id) => validMemberIds.has(id));
};

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
