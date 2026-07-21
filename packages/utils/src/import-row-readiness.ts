import type { ImportRowStatus } from '@ploutizo/types';

export interface ImportRowSelectionFields {
  status: ImportRowStatus;
  selectedForImport: boolean;
  reviewAssigneeMemberIds: readonly string[];
}

export interface ImportReviewContinueOptions {
  /** When set, assignees must resolve to at least one live org member. */
  validAssigneeMemberIds?: ReadonlySet<string>;
}

export const isImportRowSelectable = (
  row: Pick<ImportRowSelectionFields, 'status'>
): boolean => row.status !== 'invalid' && row.status !== 'skipped';

export const isImportRowResolved = (
  row: Pick<ImportRowSelectionFields, 'status'>
): boolean => row.status === 'ready';

export const rowHasLiveAssignee = (
  row: Pick<ImportRowSelectionFields, 'reviewAssigneeMemberIds'>,
  validAssigneeMemberIds?: ReadonlySet<string>
): boolean => {
  if (!validAssigneeMemberIds) {
    return row.reviewAssigneeMemberIds.length > 0;
  }
  return row.reviewAssigneeMemberIds.some((id) =>
    validAssigneeMemberIds.has(id)
  );
};

/** Selected rows may continue when derived status is ready (and assignees live). */
export const isImportRowReadyForImport = (
  row: Pick<ImportRowSelectionFields, 'status' | 'reviewAssigneeMemberIds'>,
  options?: ImportReviewContinueOptions
): boolean => {
  if (!isImportRowResolved(row)) return false;
  if (!options?.validAssigneeMemberIds) return true;
  return rowHasLiveAssignee(row, options.validAssigneeMemberIds);
};

export const getSelectedImportRows = <T extends ImportRowSelectionFields>(
  rows: readonly T[]
): T[] => rows.filter((row) => row.selectedForImport);

export const getSelectableImportRows = <T extends ImportRowSelectionFields>(
  rows: readonly T[]
): T[] => rows.filter(isImportRowSelectable);

export const canContinueImportReview = (
  rows: readonly ImportRowSelectionFields[],
  options?: ImportReviewContinueOptions
): boolean => {
  const selectedRows = getSelectedImportRows(rows);
  if (selectedRows.length === 0) return false;
  return selectedRows.every((row) => isImportRowReadyForImport(row, options));
};

export type ImportReviewContinueBlockerReason =
  | { kind: 'none_selected' }
  | { kind: 'needs_review'; count: number }
  | { kind: 'missing_assignee'; count: number };

export const getImportReviewContinueBlockerReason = (
  rows: readonly ImportRowSelectionFields[],
  options?: ImportReviewContinueOptions
): ImportReviewContinueBlockerReason | null => {
  const selectedRows = getSelectedImportRows(rows);
  if (selectedRows.length === 0) {
    return { kind: 'none_selected' };
  }

  const needsReviewCount = selectedRows.filter(
    (row) => !isImportRowResolved(row)
  ).length;
  if (needsReviewCount > 0) {
    return { kind: 'needs_review', count: needsReviewCount };
  }

  // Live-member filter only: derived `ready` already requires stored assignees.
  if (options?.validAssigneeMemberIds) {
    const missingAssigneeCount = selectedRows.filter(
      (row) => !rowHasLiveAssignee(row, options.validAssigneeMemberIds)
    ).length;
    if (missingAssigneeCount > 0) {
      return { kind: 'missing_assignee', count: missingAssigneeCount };
    }
  }

  return null;
};

/** Default English copy for continue gating; UI may map reasons for i18n later. */
export const formatImportReviewContinueBlocker = (
  reason: ImportReviewContinueBlockerReason
): string => {
  switch (reason.kind) {
    case 'none_selected':
      return 'Select at least one row to continue.';
    case 'needs_review': {
      const rowLabel =
        reason.count === 1 ? 'row still needs' : 'rows still need';
      return `${reason.count} selected ${rowLabel} review.`;
    }
    case 'missing_assignee': {
      const rowLabel = reason.count === 1 ? 'row needs' : 'rows need';
      return `${reason.count} selected ${rowLabel} an assignee.`;
    }
  }
};

export const getImportReviewContinueBlocker = (
  rows: readonly ImportRowSelectionFields[],
  options?: ImportReviewContinueOptions
): string | null => {
  const reason = getImportReviewContinueBlockerReason(rows, options);
  return reason ? formatImportReviewContinueBlocker(reason) : null;
};
