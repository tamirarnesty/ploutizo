import type { ImportDraftRow, ImportReviewRow } from '@ploutizo/types';
import type { ImportDraftDurableRow } from './evaluate-import-draft';

export type ImportDraftDurableRowSource = Omit<
  ImportDraftDurableRow,
  'selectedForImport'
>;

/** Fields required to build durable evaluation input (draft row, review row, or API record). */
export type ImportDraftDurableRowFieldSource = ImportDraftDurableRowSource;

export const importDraftDurableRowFieldsFrom = (
  row: ImportDraftDurableRowFieldSource
): ImportDraftDurableRowSource => ({
  id: row.id,
  reviewDate: row.reviewDate,
  reviewAmount: row.reviewAmount,
  reviewType: row.reviewType,
  reviewDescription: row.reviewDescription,
  parsedDate: row.parsedDate,
  parsedAmount: row.parsedAmount,
  parsedType: row.parsedType,
  parsedDescription: row.parsedDescription,
  reviewCategoryId: row.reviewCategoryId,
  reviewAssigneeMemberIds: row.reviewAssigneeMemberIds,
  reviewCounterpartAccountId: row.reviewCounterpartAccountId,
  reviewRefundOf: row.reviewRefundOf,
  reviewRefundOfBatchRowId: row.reviewRefundOfBatchRowId,
  externalId: row.externalId,
  sourceDescription: row.sourceDescription,
  reviewMatchedTransactionId: row.reviewMatchedTransactionId,
  reviewMatchDismissed: row.reviewMatchDismissed,
});

export const toImportDraftDurableRow = (
  source: ImportDraftDurableRowSource,
  selectedForImport: boolean
): ImportDraftDurableRow => ({
  ...source,
  selectedForImport,
});

export const toImportDraftDurableRowFromDraftRow = (
  row: ImportDraftRow,
  selectedForImport: boolean
): ImportDraftDurableRow =>
  toImportDraftDurableRow(
    importDraftDurableRowFieldsFrom(row),
    selectedForImport
  );

/** Map a review working-copy row to durable evaluation fields (shared web + API). */
export const toImportDraftDurableRowFromReview = (
  row: ImportReviewRow
): ImportDraftDurableRow =>
  toImportDraftDurableRowFromDraftRow(row, row.selectedForImport);
