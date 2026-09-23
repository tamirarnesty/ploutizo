import type { ImportReviewRow } from '@ploutizo/types';
import type { ImportDraftDurableRow } from './evaluate-import-draft';

/** Map a review working-copy row to durable evaluation fields (shared web + API). */
export const toImportDraftDurableRowFromReview = (
  row: ImportReviewRow
): ImportDraftDurableRow => ({
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
  selectedForImport: row.selectedForImport,
  externalId: row.externalId,
  sourceDescription: row.sourceDescription,
  reviewMatchedTransactionId: row.reviewMatchedTransactionId,
  reviewMatchDismissed: row.reviewMatchDismissed,
});
