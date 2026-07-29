import {
  BILL_PAYMENT_CATEGORY_NAME,
  BILL_PAYMENT_DESCRIPTION_PATTERN,
} from '@ploutizo/types';
import type { ImportTransactionType, MerchantMatchType } from '@ploutizo/types';
import { findMatchingMerchantRule } from './match-merchant-rule';

export { BILL_PAYMENT_DESCRIPTION_PATTERN };

export interface ClassifyMerchantRule {
  pattern: string;
  matchType: MerchantMatchType;
  renameTo: string | null;
  categoryId: string | null;
  assigneeId: string | null;
  tagIds: string[];
}

export interface ClassifyImportRowInput {
  /** Bank/source description used for matching (immutable provenance). */
  sourceDescription: string | null;
  parsedType: ImportTransactionType | null;
  parsedDescription: string | null;
  /** CSV name-resolved category, applied only when automation left category empty. */
  csvCategoryId: string | null;
  csvAssigneeMemberIds: string[];
  csvTagIds: string[];
  merchantRules: readonly ClassifyMerchantRule[];
  /** Seeded Bill Payment category id; required for settlement readability. */
  billPaymentCategoryId: string | null;
  /** Target card owners — default assignees when none set by rule/CSV. */
  accountOwnerMemberIds: readonly string[];
}

export interface ClassifiedImportRowValues {
  reviewType: ImportTransactionType | null;
  reviewDescription: string | null;
  reviewCategoryId: string | null;
  reviewAssigneeMemberIds: string[];
  reviewTagIds: string[];
  /** True when bill-payment detection coerced the row to settlement. */
  detectedBillPayment: boolean;
  matchedMerchantRule: boolean;
}

const trimOrNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Detect card bill-payment descriptions before merchant rules run.
 * Matches the seeded "PAYMENT THANK YOU" contains rule (case-insensitive).
 */
export const isBillPaymentDescription = (
  description: string | null | undefined
): boolean => {
  const haystack = description?.trim().toUpperCase() ?? '';
  if (!haystack) return false;
  return haystack.includes(BILL_PAYMENT_DESCRIPTION_PATTERN);
};

/**
 * Initial import classification — runs once after upload.
 * Order: bill-payment detection → merchant rules → ownership defaults → CSV gap-fill.
 * Review edits never re-run this pipeline.
 */
export const classifyImportRow = (
  input: ClassifyImportRowInput
): ClassifiedImportRowValues => {
  const sourceDescription = trimOrNull(input.sourceDescription);
  const matchDescription =
    sourceDescription ?? trimOrNull(input.parsedDescription) ?? '';

  let reviewType = input.parsedType;
  let reviewDescription = trimOrNull(input.parsedDescription);
  let reviewCategoryId: string | null = null;
  let reviewAssigneeMemberIds: string[] = [];
  let reviewTagIds: string[] = [];
  let detectedBillPayment = false;
  let matchedMerchantRule = false;

  // 1. Bill-payment detection before merchant rules.
  if (isBillPaymentDescription(matchDescription)) {
    detectedBillPayment = true;
    reviewType = 'settlement';
    reviewCategoryId = input.billPaymentCategoryId;
    reviewDescription =
      trimOrNull(BILL_PAYMENT_CATEGORY_NAME) ?? reviewDescription;
  } else if (reviewType === 'settlement') {
    // Settlements get Bill Payment for list readability even without detection.
    reviewCategoryId = input.billPaymentCategoryId;
  }

  // 2. Merchant rules (first match wins; already priority-ordered).
  const matched = findMatchingMerchantRule(
    matchDescription,
    input.merchantRules
  );
  if (matched) {
    matchedMerchantRule = true;
    if (matched.renameTo?.trim()) {
      reviewDescription = matched.renameTo.trim();
    }
    // Settlements keep Bill Payment category; rules may still rename/tag/assign.
    if (reviewType !== 'settlement' && matched.categoryId) {
      reviewCategoryId = matched.categoryId;
    }
    if (matched.assigneeId) {
      reviewAssigneeMemberIds = [matched.assigneeId];
    }
    if (matched.tagIds.length > 0) {
      reviewTagIds = [...new Set(matched.tagIds)];
    }
  }

  // 3. Ownership defaults when assignees still empty (expense/refund/settlement).
  if (
    reviewAssigneeMemberIds.length === 0 &&
    input.accountOwnerMemberIds.length > 0
  ) {
    reviewAssigneeMemberIds = [...input.accountOwnerMemberIds];
  }

  // 4. CSV hints fill gaps only — never overwrite automation.
  if (!reviewCategoryId && input.csvCategoryId) {
    reviewCategoryId = input.csvCategoryId;
  }
  if (
    reviewAssigneeMemberIds.length === 0 &&
    input.csvAssigneeMemberIds.length > 0
  ) {
    reviewAssigneeMemberIds = [...input.csvAssigneeMemberIds];
  }
  if (reviewTagIds.length === 0 && input.csvTagIds.length > 0) {
    reviewTagIds = [...input.csvTagIds];
  }

  return {
    reviewType,
    reviewDescription,
    reviewCategoryId,
    reviewAssigneeMemberIds,
    reviewTagIds,
    detectedBillPayment,
    matchedMerchantRule,
  };
};
