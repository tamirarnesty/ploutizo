import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import { resolveImportRowReviewType } from '@ploutizo/utils/import-row-status';
import type { ImportDraftRow, ImportTransactionType } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { Category } from '@/lib/data-access/categories';
import { deriveImportDraftRowStatus } from '@/lib/data-access/imports/deriveImportDraftRowStatus';

export { deriveImportDraftRowStatus };

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

export const resolveImportRowType = (
  row: Pick<ImportDraftRow, 'reviewType' | 'parsedType'>
): ImportTransactionType | null => resolveImportRowReviewType(row);

export const isSettlementImportRow = (row: ImportDraftRow): boolean =>
  resolveImportRowType(row) === 'settlement';

export const isRefundImportRow = (row: ImportDraftRow): boolean =>
  resolveImportRowType(row) === 'refund';
