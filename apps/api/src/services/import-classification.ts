import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import {
  classifyImportRow,
  evaluateImportRefundLinks,
  inheritRefundLinkFields,
} from '@ploutizo/utils';
import type {
  ClassifyMerchantRule,
  ExistingRefundTargetExpense,
  ImportRefundLinkDraftRow,
  ImportRefundLinkEvaluation,
} from '@ploutizo/utils';
import {
  deriveImportRowStatus,
  formatImportRowStructuralInvalidReason,
  resolveImportRowReviewType,
  toImportRowStatusFields,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import type { ImportTransactionType } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { ImportDraftRowRecord } from '@/lib/queries/imports';
import type { ParsedImportRow } from '@/lib/imports/normalizedCsv';
import type { ResolvedImportReferences } from '@ploutizo/utils';

export interface ClassificationCatalogs {
  merchantRules: readonly ClassifyMerchantRule[];
  billPaymentCategoryId: string | null;
  accountOwnerMemberIds: readonly string[];
}

/** Apply once-after-upload classification onto a parsed CSV row + CSV name refs. */
export const applyInitialImportClassification = (
  row: ParsedImportRow,
  csvRefs: ResolvedImportReferences,
  catalogs: ClassificationCatalogs
) => {
  const classified = classifyImportRow({
    sourceDescription: row.sourceDescription,
    parsedType: toImportTransactionType(row.parsedType),
    parsedDescription: row.parsedDescription,
    csvCategoryId: csvRefs.reviewCategoryId,
    csvAssigneeMemberIds: csvRefs.reviewAssigneeMemberIds,
    csvTagIds: csvRefs.reviewTagIds,
    merchantRules: catalogs.merchantRules,
    billPaymentCategoryId: catalogs.billPaymentCategoryId,
    accountOwnerMemberIds: catalogs.accountOwnerMemberIds,
  });

  const statusFields = toImportRowStatusFields({
    status: row.status,
    reviewDate: row.reviewDate ?? null,
    reviewAmount: row.reviewAmount ?? null,
    reviewType: classified.reviewType,
    reviewDescription: classified.reviewDescription,
    parsedDate: row.parsedDate ?? null,
    parsedAmount: row.parsedAmount ?? null,
    parsedType: toImportTransactionType(row.parsedType),
    parsedDescription: row.parsedDescription ?? null,
    reviewCategoryId: classified.reviewCategoryId,
    reviewAssigneeMemberIds: classified.reviewAssigneeMemberIds,
    reviewCounterpartAccountId: null,
    refundLinkBlocked: false,
  });
  const status = deriveImportRowStatus(statusFields);

  return {
    reviewType: classified.reviewType,
    reviewDescription: classified.reviewDescription,
    reviewCategoryId: classified.reviewCategoryId,
    reviewAssigneeMemberIds: classified.reviewAssigneeMemberIds,
    reviewTagIds: classified.reviewTagIds,
    status,
    invalidReason:
      status === 'invalid'
        ? formatImportRowStructuralInvalidReason(statusFields)
        : null,
  };
};

/** Clear type-incompatible review fields when the user changes row type. */
export const deriveTypeChangeSideEffects = (
  nextType: ImportTransactionType | null,
  billPaymentCategoryId: string | null
): Partial<UpdateImportDraftRowInput> => {
  const effects: Partial<UpdateImportDraftRowInput> = {
    reviewCategoryId: null,
    reviewRefundOf: null,
    reviewRefundOfBatchRowId: null,
    reviewCounterpartAccountId: null,
  };

  if (nextType === 'settlement') {
    effects.reviewCategoryId = billPaymentCategoryId;
  }

  return effects;
};

export const toRefundLinkDraftRow = (
  row: Pick<
    ImportDraftRowRecord,
    | 'id'
    | 'reviewType'
    | 'parsedType'
    | 'reviewAmount'
    | 'parsedAmount'
    | 'reviewCategoryId'
    | 'reviewAssigneeMemberIds'
    | 'reviewRefundOf'
    | 'reviewRefundOfBatchRowId'
    | 'selectedForImport'
  >
): ImportRefundLinkDraftRow => ({
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

export const buildRefundLinkEvaluations = (
  draftRows: readonly ImportDraftRowRecord[],
  targetAccountId: string,
  existingExpenses: ReadonlyMap<string, ExistingRefundTargetExpense>
): Map<string, ImportRefundLinkEvaluation> =>
  evaluateImportRefundLinks(
    draftRows.map(toRefundLinkDraftRow),
    { targetAccountId, existingExpenses }
  );

export const derivePersistedRowStatus = (
  row: {
    status: ImportDraftRowRecord['status'];
    reviewDate: string | null;
    reviewAmount: number | null;
    reviewType: string | null;
    reviewDescription: string | null;
    parsedDate: string | null;
    parsedAmount: number | null;
    parsedType: string | null;
    parsedDescription: string | null;
    reviewCategoryId: string | null;
    reviewAssigneeMemberIds: string[];
    reviewCounterpartAccountId: string | null;
  },
  refundLinkBlocked: boolean
) => {
  const statusFields = toImportRowStatusFields({
    status: row.status,
    reviewDate: row.reviewDate,
    reviewAmount: row.reviewAmount,
    reviewType: toImportTransactionType(row.reviewType),
    reviewDescription: row.reviewDescription,
    parsedDate: row.parsedDate,
    parsedAmount: row.parsedAmount,
    parsedType: toImportTransactionType(row.parsedType),
    parsedDescription: row.parsedDescription,
    reviewCategoryId: row.reviewCategoryId,
    reviewAssigneeMemberIds: row.reviewAssigneeMemberIds,
    reviewCounterpartAccountId: row.reviewCounterpartAccountId,
    refundLinkBlocked,
  });
  const status = deriveImportRowStatus(statusFields);
  return {
    status,
    invalidReason:
      status === 'invalid'
        ? formatImportRowStructuralInvalidReason(statusFields)
        : null,
  };
};

export const resolveBillPaymentCategoryId = (
  categories: readonly { id: string; name: string }[]
): string | null =>
  categories.find((category) => category.name === BILL_PAYMENT_CATEGORY_NAME)
    ?.id ?? null;

export const applyRefundLinkInheritance = (
  patch: UpdateImportDraftRowInput,
  evaluation: ImportRefundLinkEvaluation | undefined
): UpdateImportDraftRowInput => {
  if (!evaluation) return patch;
  const inherited = inheritRefundLinkFields(evaluation);
  if (!inherited) return patch;

  const next = { ...patch };
  if (patch.reviewCategoryId === undefined) {
    next.reviewCategoryId = inherited.reviewCategoryId;
  }
  if (patch.reviewAssigneeMemberIds === undefined) {
    next.reviewAssigneeMemberIds = inherited.reviewAssigneeMemberIds;
  }
  return next;
};

export const resolveReviewTypeFromRow = (
  row: Pick<ImportDraftRowRecord, 'reviewType' | 'parsedType'>
) =>
  resolveImportRowReviewType({
    reviewType: toImportTransactionType(row.reviewType),
    parsedType: toImportTransactionType(row.parsedType),
  });
