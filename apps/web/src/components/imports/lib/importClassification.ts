import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import { evaluateImportRefundLinks } from '@ploutizo/utils';
import {
  deriveImportRowStatus,
  resolveImportRowReviewType,
  toImportRowStatusFields,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import type { ImportRefundLinkDraftRow } from '@ploutizo/utils';
import type { ImportDraftRow, ImportTransactionType } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { Category } from '@/lib/data-access/categories';

export const findBillPaymentCategoryId = (
  categories: readonly Category[]
): string | null =>
  categories.find((category) => category.name === BILL_PAYMENT_CATEGORY_NAME)
    ?.id ?? null;

/** Client-side type switch clears incompatible fields (mirrors transaction form). */
export const buildImportTypeChangePatch = (
  nextType: ImportTransactionType,
  billPaymentCategoryId: string | null
): UpdateImportDraftRowInput => {
  const patch: UpdateImportDraftRowInput = {
    reviewType: nextType,
    reviewCategoryId: null,
    reviewRefundOf: null,
    reviewRefundOfBatchRowId: null,
    reviewCounterpartAccountId: null,
  };
  if (nextType === 'settlement') {
    patch.reviewCategoryId = billPaymentCategoryId;
  }
  return patch;
};

const toRefundDraftRow = (row: ImportDraftRow): ImportRefundLinkDraftRow => ({
  id: row.id,
  reviewType: toImportTransactionType(row.reviewType),
  parsedType: toImportTransactionType(row.parsedType),
  reviewAmount: row.reviewAmount,
  parsedAmount: row.parsedAmount,
  reviewCategoryId: row.reviewCategoryId,
  reviewAssigneeMemberIds: row.reviewAssigneeMemberIds,
  reviewRefundOf: row.reviewRefundOf,
  reviewRefundOfBatchRowId: row.reviewRefundOfBatchRowId,
  selectedForImport: row.selectedForImport,
});

/** Derive status with same-import refund-link awareness (optimistic). */
export const deriveImportDraftRowStatus = (
  row: ImportDraftRow,
  draftRows: readonly ImportDraftRow[],
  targetAccountId: string
) => {
  const evaluations = evaluateImportRefundLinks(
    draftRows.map(toRefundDraftRow),
    { targetAccountId }
  );
  const evaluation = evaluations.get(row.id);
  return deriveImportRowStatus(
    toImportRowStatusFields({
      ...row,
      refundLinkBlocked: Boolean(evaluation?.linked && !evaluation.valid),
    })
  );
};

export const resolveImportRowType = (
  row: Pick<ImportDraftRow, 'reviewType' | 'parsedType'>
): ImportTransactionType | null => resolveImportRowReviewType(row);

export const isSettlementImportRow = (row: ImportDraftRow): boolean =>
  resolveImportRowType(row) === 'settlement';

export const isRefundImportRow = (row: ImportDraftRow): boolean =>
  resolveImportRowType(row) === 'refund';

export const isExpenseImportRow = (row: ImportDraftRow): boolean =>
  resolveImportRowType(row) === 'expense';
