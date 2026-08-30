import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import type { ImportTransactionType, MerchantMatchType } from '@ploutizo/types';
import { createImportReferenceResolver } from './match-import-references';
import { findMatchingMerchantRule } from './match-merchant-rule';
import type {
  ImportCsvHints,
  ImportReferenceCatalogs,
} from './match-import-references';

const PAYMENT_PHRASE_VAULT = new Set([
  'PAYMENT THANK YOU',
  'PAYMENT RECEIVED THANK YOU',
  'PAIEMENT MERCI',
]);

export interface ClassifyImportRowInput extends ImportCsvHints {
  parsedType: ImportTransactionType | null;
  parsedDescription: string | null;
  paymentHint?: boolean;
  externalId: string | null;
}

export interface ClassifyImportMerchantRule {
  pattern: string;
  matchType: MerchantMatchType;
  renameTo: string | null;
  categoryId: string | null;
  assigneeId: string | null;
  tagIds: readonly string[];
}

export interface ClassifyImportContext {
  catalogs: ImportReferenceCatalogs;
  merchantRules: readonly ClassifyImportMerchantRule[];
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
  externalId: string | null;
}

const normalizePaymentPhrase = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const matchesPaymentPhraseVault = (description: string | null): boolean => {
  if (!description?.trim()) return false;
  return PAYMENT_PHRASE_VAULT.has(normalizePaymentPhrase(description));
};

const stripLeadingSpreadsheetApostrophe = (
  value: string | null
): string | null => {
  if (value == null) return null;
  const stripped = value.startsWith("'") ? value.slice(1) : value;
  return stripped.length > 0 ? stripped : null;
};

const findBillPaymentCategoryId = (
  catalogs: ImportReferenceCatalogs
): string | null => {
  const match = catalogs.categories.find(
    (category) => category.name === BILL_PAYMENT_CATEGORY_NAME
  );
  return match?.id ?? null;
};

const isCreditBaseline = (type: ImportTransactionType | null): boolean =>
  type === 'refund';

const isSettlementRow = (row: ClassifyImportRowInput): boolean => {
  if (row.parsedType === 'settlement' || row.paymentHint) return true;
  return (
    isCreditBaseline(row.parsedType) &&
    matchesPaymentPhraseVault(row.parsedDescription)
  );
};

const classifySettlement = (
  row: ClassifyImportRowInput,
  context: ClassifyImportContext
): ClassifiedImportReviewValues => ({
  reviewType: 'settlement',
  reviewDescription: BILL_PAYMENT_CATEGORY_NAME,
  reviewCategoryId: findBillPaymentCategoryId(context.catalogs),
  reviewAssigneeMemberIds: [],
  reviewTagIds: [],
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
  externalId: stripLeadingSpreadsheetApostrophe(row.externalId),
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
    context.merchantRules
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

  return {
    reviewType: row.parsedType,
    reviewDescription: renamed || row.parsedDescription,
    reviewCategoryId,
    reviewAssigneeMemberIds,
    reviewTagIds,
    reviewCounterpartAccountId: null,
    reviewRefundOf: null,
    externalId: stripLeadingSpreadsheetApostrophe(row.externalId),
  };
};

export const classifyImportRows = (
  rows: readonly ClassifyImportRowInput[],
  context: ClassifyImportContext
): ClassifiedImportReviewValues[] => {
  const resolveCsvHints = createImportReferenceResolver(context.catalogs);

  return rows.map((row) =>
    isSettlementRow(row)
      ? classifySettlement(row, context)
      : classifyExpenseOrRefund(row, context, resolveCsvHints)
  );
};
