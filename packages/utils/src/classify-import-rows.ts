import {
  BILL_PAYMENT_CATEGORY_NAME,
  isBillPaymentMerchantRulePattern,
  matchesBillPaymentPhrase,
} from '@ploutizo/types';
import type {
  ImportClassificationMerchantRule,
  ImportTransactionType,
} from '@ploutizo/types';
import { createImportReferenceResolver } from './match-import-references';
import { findMatchingMerchantRule } from './match-merchant-rule';
import type {
  ImportCsvHints,
  ImportReferenceCatalogs,
} from './match-import-references';

export type ImportClassificationHint = 'bill_payment';

export interface ClassifyImportRowInput extends ImportCsvHints {
  parsedType: ImportTransactionType | null;
  parsedDescription: string | null;
  classificationHint?: ImportClassificationHint | null;
  externalId: string | null;
}

/** @deprecated Use `ImportClassificationMerchantRule` from `@ploutizo/types`. */
export interface ClassifyImportMerchantRule extends ImportClassificationMerchantRule {}

export interface ClassifyImportContext {
  catalogs: ImportReferenceCatalogs;
  merchantRules: readonly ImportClassificationMerchantRule[];
  accountOwnerMemberIds: readonly string[];
}

export interface ClassifiedImportReviewValues {
  reviewType: ImportTransactionType | null;
  reviewDescription: string | null;
  reviewCategoryId: string | null;
  reviewAssigneeMemberIds: string[];
  reviewTagIds: string[];
  reviewCounterpartAccountId: null;
  reviewRefundOf: null;
}

const billPaymentCategoryIdFromCatalog = (
  catalogs: ImportReferenceCatalogs
): string | null => {
  const match = catalogs.categories.find(
    (category) => category.name === BILL_PAYMENT_CATEGORY_NAME
  );
  return match?.id ?? null;
};

const merchantRulesForClassification = (
  rules: readonly ImportClassificationMerchantRule[]
): readonly ImportClassificationMerchantRule[] =>
  rules.filter((rule) => !isBillPaymentMerchantRulePattern(rule.pattern));

const isRefundBaseline = (type: ImportTransactionType | null): boolean =>
  type === 'refund';

const hasBillPaymentHint = (row: ClassifyImportRowInput): boolean =>
  row.classificationHint === 'bill_payment';

const isSettlementRow = (row: ClassifyImportRowInput): boolean => {
  if (row.parsedType === 'settlement' || hasBillPaymentHint(row)) return true;
  return (
    isRefundBaseline(row.parsedType) &&
    matchesBillPaymentPhrase(row.parsedDescription)
  );
};

const withUnselectedReviewDefaults = (
  review: Omit<
    ClassifiedImportReviewValues,
    'reviewCounterpartAccountId' | 'reviewRefundOf'
  >
): ClassifiedImportReviewValues => ({
  ...review,
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
});

// Settlements use a fixed Bill Payment shape; CSV hints are intentionally ignored.
const classifySettlement = (
  _row: ClassifyImportRowInput,
  context: ClassifyImportContext
): ClassifiedImportReviewValues =>
  withUnselectedReviewDefaults({
    reviewType: 'settlement',
    reviewDescription: BILL_PAYMENT_CATEGORY_NAME,
    reviewCategoryId: billPaymentCategoryIdFromCatalog(context.catalogs),
    reviewAssigneeMemberIds: [],
    reviewTagIds: [],
  });

const classifyExpenseOrRefund = (
  row: ClassifyImportRowInput,
  context: ClassifyImportContext,
  resolveCsvHints: ReturnType<typeof createImportReferenceResolver>
): ClassifiedImportReviewValues => {
  const csv = resolveCsvHints({
    csvCategoryName: row.csvCategoryName,
    csvAssigneeName: row.csvAssigneeName,
    csvTagNames: row.csvTagNames,
  });
  const rule = findMatchingMerchantRule(
    row.parsedDescription ?? '',
    merchantRulesForClassification(context.merchantRules)
  );

  const reviewCategoryId = csv.reviewCategoryId ?? rule?.categoryId ?? null;
  const reviewTagIds =
    csv.reviewTagIds.length > 0
      ? [...csv.reviewTagIds]
      : [...(rule?.tagIds ?? [])];
  const reviewAssigneeMemberIds =
    csv.reviewAssigneeMemberIds.length > 0
      ? [...csv.reviewAssigneeMemberIds]
      : rule?.assigneeId
        ? [rule.assigneeId]
        : [...context.accountOwnerMemberIds];
  const renamed = rule?.renameTo?.trim();

  return withUnselectedReviewDefaults({
    reviewType: row.parsedType,
    reviewDescription: renamed || row.parsedDescription,
    reviewCategoryId,
    reviewAssigneeMemberIds,
    reviewTagIds,
  });
};

export type ClassifyImportRow = (
  row: ClassifyImportRowInput
) => ClassifiedImportReviewValues;

export const createImportRowClassifier = (
  context: ClassifyImportContext
): ClassifyImportRow => {
  const resolveCsvHints = createImportReferenceResolver(context.catalogs);

  return (row) =>
    isSettlementRow(row)
      ? classifySettlement(row, context)
      : classifyExpenseOrRefund(row, context, resolveCsvHints);
};

export const classifyImportRow = (
  row: ClassifyImportRowInput,
  context: ClassifyImportContext
): ClassifiedImportReviewValues => createImportRowClassifier(context)(row);

export const classifyImportRows = (
  rows: readonly ClassifyImportRowInput[],
  context: ClassifyImportContext
): ClassifiedImportReviewValues[] => {
  const classifyRow = createImportRowClassifier(context);
  return rows.map(classifyRow);
};
