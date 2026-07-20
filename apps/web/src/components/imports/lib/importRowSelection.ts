import type { ImportDraftRow } from '@ploutizo/types';

export const isImportRowSelectable = (row: ImportDraftRow): boolean =>
  row.status !== 'invalid' && row.status !== 'skipped';

export const isImportRowResolved = (row: ImportDraftRow): boolean =>
  row.status === 'ready';

export const rowHasAssignee = (row: ImportDraftRow): boolean =>
  row.reviewAssigneeMemberIds.length > 0;

export const isImportRowReadyForImport = (row: ImportDraftRow): boolean =>
  isImportRowResolved(row) && rowHasAssignee(row);

export const getSelectedImportRows = (
  rows: ImportDraftRow[]
): ImportDraftRow[] => rows.filter((row) => row.selectedForImport);

export const canContinueImportReview = (rows: ImportDraftRow[]): boolean => {
  const selectedRows = getSelectedImportRows(rows);
  if (selectedRows.length === 0) return false;
  return selectedRows.every(isImportRowReadyForImport);
};

export const getImportReviewContinueBlocker = (
  rows: ImportDraftRow[]
): string | null => {
  const selectedRows = getSelectedImportRows(rows);
  if (selectedRows.length === 0) {
    return 'Select at least one row to continue.';
  }

  const needsReviewCount = selectedRows.filter(
    (row) => !isImportRowResolved(row)
  ).length;
  if (needsReviewCount > 0) {
    const rowLabel =
      needsReviewCount === 1 ? 'row still needs' : 'rows still need';
    return `${needsReviewCount} selected ${rowLabel} review.`;
  }

  const missingAssigneeCount = selectedRows.filter(
    (row) => !rowHasAssignee(row)
  ).length;
  if (missingAssigneeCount > 0) {
    const rowLabel = missingAssigneeCount === 1 ? 'row needs' : 'rows need';
    return `${missingAssigneeCount} selected ${rowLabel} an assignee.`;
  }

  return null;
};

export const getSelectableImportRows = (
  rows: ImportDraftRow[]
): ImportDraftRow[] => rows.filter(isImportRowSelectable);
