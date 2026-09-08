import type {
  ImportTransactionType,
  ReviewedImportValues,
} from '@ploutizo/types';
import { toImportTransactionType } from './import-coercion';

/** Durable/optimistic import row fields needed to resolve transaction values. */
type ReviewedImportValueSource = {
  reviewDate?: string | null;
  parsedDate?: string | null;
  reviewAmount?: number | null;
  parsedAmount?: number | null;
  reviewType?: string | null;
  parsedType?: string | null;
  reviewDescription?: string | null;
  parsedDescription?: string | null;
  reviewCategoryId?: string | null;
  reviewAssigneeMemberIds?: readonly string[] | null;
  reviewCounterpartAccountId?: string | null;
  reviewRefundOf?: string | null;
  reviewRefundOfBatchRowId?: string | null;
  reviewNotes?: string | null;
  reviewTagIds?: readonly string[] | null;
};

const resolveDescription = (
  reviewDescription: string | null | undefined,
  parsedDescription: string | null | undefined
): string | null => {
  const description = reviewDescription ?? parsedDescription;
  const trimmed = description?.trim();
  return trimmed ? trimmed : null;
};

const resolveType = (
  reviewType: string | null | undefined,
  parsedType: string | null | undefined
): ImportTransactionType | null =>
  reviewType == null
    ? toImportTransactionType(parsedType)
    : toImportTransactionType(reviewType);

/** Effective transaction values. Selection and provenance stay outside this object. */
export const resolveReviewedImportValues = (
  row: ReviewedImportValueSource
): ReviewedImportValues => ({
  date: row.reviewDate ?? row.parsedDate ?? null,
  amount: row.reviewAmount ?? row.parsedAmount ?? null,
  type: resolveType(row.reviewType, row.parsedType),
  description: resolveDescription(row.reviewDescription, row.parsedDescription),
  categoryId: row.reviewCategoryId ?? null,
  assigneeMemberIds: [...(row.reviewAssigneeMemberIds ?? [])],
  counterpartAccountId: row.reviewCounterpartAccountId ?? null,
  refundOf: row.reviewRefundOf ?? null,
  refundOfBatchRowId: row.reviewRefundOfBatchRowId ?? null,
  notes: row.reviewNotes ?? null,
  tagIds: [...(row.reviewTagIds ?? [])],
});
