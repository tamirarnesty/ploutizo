import {
  formatAccountLabel,
  formatTransactionTypeLabel,
} from '@ploutizo/utils';
import { IMPORT_TRANSACTION_TYPE_VALUES } from '@ploutizo/types';
import type {
  ImportBatchStatus,
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
  ImportTransactionType,
  OrgMember,
} from '@ploutizo/types';

export const resolveImportRowType = (
  row: ImportDraftRow
): ImportTransactionType | null =>
  row.reviewType ??
  row.parsedType ??
  (isImportTransactionType(row.sourceType) ? row.sourceType : null);

const isImportTransactionType = (
  value: string | null | undefined
): value is ImportTransactionType =>
  IMPORT_TRANSACTION_TYPE_VALUES.includes(value as ImportTransactionType);

export const formatImportTransactionTypeLabel = (
  type: ImportTransactionType
): string => formatTransactionTypeLabel(type);

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

export const resolveCategoryIdByName = (
  categoryName: string | null | undefined,
  categories: { id: string; name: string }[]
): string => {
  if (!categoryName) return '';
  const normalized = categoryName.trim().toLowerCase();
  return (
    categories.find(
      (category) => category.name.trim().toLowerCase() === normalized
    )?.id ?? ''
  );
};

export const resolveImportRowOriginalDescription = (
  row: ImportDraftRow
): string | null => {
  const original = row.sourceDescription ?? row.parsedDescription;
  const trimmed = original?.trim();
  return trimmed ? trimmed : null;
};

export const getImportRowReviewBlockers = (row: ImportDraftRow): string[] => {
  const blockers: string[] = [];
  const reviewDate = row.reviewDate ?? row.parsedDate;
  if (!reviewDate) blockers.push('date');
  if (row.reviewAmount == null && row.parsedAmount == null) {
    blockers.push('amount');
  }
  if (!row.reviewDescription?.trim() && !row.parsedDescription?.trim()) {
    blockers.push('description');
  }
  if (!row.reviewCategoryName?.trim()) blockers.push('category');
  if (row.reviewAssigneeMemberIds.length === 0) blockers.push('assignee');

  const type = resolveImportRowType(row);
  if (type === 'settlement' && row.status === 'needs_review') {
    blockers.push('settlement review');
  }

  return blockers;
};

export const getImportRowStatusTooltip = (row: ImportDraftRow): string => {
  switch (row.status) {
    case 'ready':
      return 'Ready to import';
    case 'needs_review': {
      const blockers = getImportRowReviewBlockers(row);
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
  if (row.reviewTags.length > 0) return true;
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
