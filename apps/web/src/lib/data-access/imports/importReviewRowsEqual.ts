import type { ImportReviewRow } from '@ploutizo/types';
import { importReviewFieldValuesEqual } from './importReviewFieldEqual';

const scalarEqual = (left: unknown, right: unknown) => Object.is(left, right);

/** Whether two working-copy rows are observably equal for collection subscribers. */
export const importReviewRowsEqual = (
  left: ImportReviewRow,
  right: ImportReviewRow
): boolean => {
  if (left.id !== right.id) return false;

  return (
    left.batchId === right.batchId &&
    left.rowNumber === right.rowNumber &&
    left.status === right.status &&
    scalarEqual(left.invalidReason, right.invalidReason) &&
    left.selectedForImport === right.selectedForImport &&
    scalarEqual(left.externalId, right.externalId) &&
    scalarEqual(left.sourceDate, right.sourceDate) &&
    scalarEqual(left.sourceAmount, right.sourceAmount) &&
    scalarEqual(left.sourceDescription, right.sourceDescription) &&
    scalarEqual(left.sourceType, right.sourceType) &&
    scalarEqual(left.parsedDate, right.parsedDate) &&
    scalarEqual(left.parsedAmount, right.parsedAmount) &&
    scalarEqual(left.parsedType, right.parsedType) &&
    scalarEqual(left.parsedDescription, right.parsedDescription) &&
    scalarEqual(left.reviewDate, right.reviewDate) &&
    scalarEqual(left.reviewAmount, right.reviewAmount) &&
    scalarEqual(left.reviewType, right.reviewType) &&
    scalarEqual(left.reviewDescription, right.reviewDescription) &&
    scalarEqual(left.reviewCategoryId, right.reviewCategoryId) &&
    importReviewFieldValuesEqual(
      left.reviewAssigneeMemberIds,
      right.reviewAssigneeMemberIds
    ) &&
    scalarEqual(
      left.reviewCounterpartAccountId,
      right.reviewCounterpartAccountId
    ) &&
    scalarEqual(left.reviewRefundOf, right.reviewRefundOf) &&
    scalarEqual(
      left.reviewRefundOfBatchRowId,
      right.reviewRefundOfBatchRowId
    ) &&
    scalarEqual(left.reviewRefundLinkHint, right.reviewRefundLinkHint) &&
    scalarEqual(
      left.reviewMatchedTransactionId,
      right.reviewMatchedTransactionId
    ) &&
    left.reviewMatchDismissed === right.reviewMatchDismissed &&
    scalarEqual(left.reviewNotes, right.reviewNotes) &&
    importReviewFieldValuesEqual(left.reviewTagIds, right.reviewTagIds) &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt &&
    rawDataEqual(left.rawData, right.rawData)
  );
};

const rawDataEqual = (
  left: Record<string, string>,
  right: Record<string, string>
) => {
  if (left === right) return true;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
};
