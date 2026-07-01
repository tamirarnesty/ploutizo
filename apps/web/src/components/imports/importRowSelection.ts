import type { ImportDraftRow } from '@ploutizo/types';

export const isImportRowSelectable = (row: ImportDraftRow): boolean =>
  row.status !== 'invalid' && row.status !== 'skipped';

export const isImportRowResolved = (row: ImportDraftRow): boolean =>
  row.status === 'ready';

export const getSelectedImportRows = (
  rows: ImportDraftRow[]
): ImportDraftRow[] => rows.filter((row) => row.selectedForImport);

export const canContinueImportReview = (rows: ImportDraftRow[]): boolean => {
  const selectedRows = getSelectedImportRows(rows);
  if (selectedRows.length === 0) return false;
  return selectedRows.every(isImportRowResolved);
};

export const getSelectableImportRows = (
  rows: ImportDraftRow[]
): ImportDraftRow[] => rows.filter(isImportRowSelectable);
