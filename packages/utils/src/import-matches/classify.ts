import { differenceInCalendarDays } from 'date-fns';
import type { MatchTargetFact } from '@ploutizo/types';
import {
  resolveImportRowReviewAmount,
  resolveImportRowReviewDate,
  resolveImportRowReviewType,
  toImportTransactionType,
} from '../import-row-status';
import {
  importDescriptionsAreSimilar,
  normalizeImportMatchDescription,
} from './description';
import {
  IMPORT_MATCH_DATE_TOLERANCE_DAYS,
  IMPORT_MATCH_NEAR_AMOUNT_CENTS,
} from './types';
import type {
  ExactImportMatchKind,
  ImportMatchCandidate,
  ImportMatchDraftRow,
  ImportMatchKind,
} from './types';

const EXACT_MATCH_EXPLANATIONS: Record<ExactImportMatchKind, string> = {
  external_id: 'Exact external ID match on this card.',
  identity: 'Exact match on type, date, amount, and original description.',
};

const ADVISORY_MATCH_EXPLANATIONS: Record<
  Exclude<ImportMatchKind, ExactImportMatchKind>,
  string
> = {
  fuzzy_description: 'Similar description on the same date and amount.',
  date_tolerant:
    'Possible settlement match with a nearby date and the same amount.',
  near_amount: 'Possible match with a nearby amount on the same date.',
};

export const isExactImportMatchKind = (
  kind: ImportMatchKind
): kind is ExactImportMatchKind =>
  kind === 'external_id' || kind === 'identity';

const candidate = (
  transactionId: string,
  kind: ImportMatchKind
): ImportMatchCandidate => ({
  transactionId,
  kind,
  explanation: isExactImportMatchKind(kind)
    ? EXACT_MATCH_EXPLANATIONS[kind]
    : ADVISORY_MATCH_EXPLANATIONS[kind],
});

const rowRawDescription = (row: ImportMatchDraftRow): string =>
  normalizeImportMatchDescription(
    row.sourceDescription ?? row.parsedDescription
  );

const transactionRawDescription = (transaction: MatchTargetFact): string =>
  normalizeImportMatchDescription(
    transaction.rawDescription ?? transaction.description
  );

export const classifyAgainstTransaction = (
  row: ImportMatchDraftRow,
  transaction: MatchTargetFact,
  targetAccountId: string
): ImportMatchCandidate | null => {
  if (transaction.accountId !== targetAccountId) return null;
  if (transaction.deleted) return null;

  const rowExternalId = row.externalId?.trim() || null;
  const txExternalId = transaction.externalId?.trim() || null;
  if (rowExternalId && txExternalId && rowExternalId === txExternalId) {
    return candidate(transaction.id, 'external_id');
  }

  const type = resolveImportRowReviewType({
    reviewType: toImportTransactionType(row.reviewType),
    parsedType: toImportTransactionType(row.parsedType),
  });
  const date = resolveImportRowReviewDate(row);
  const amount = resolveImportRowReviewAmount(row);
  if (!type || !date || amount == null) return null;
  if (transaction.type !== type) return null;

  const rowDescription = rowRawDescription(row);
  const txDescription = transactionRawDescription(transaction);
  const sameDate = transaction.date === date;
  const sameAmount = transaction.amount === amount;
  const sameRawDescription = rowDescription === txDescription;
  const similarDescription = importDescriptionsAreSimilar(
    rowDescription,
    txDescription
  );

  if (!rowExternalId && sameDate && sameAmount && sameRawDescription) {
    return candidate(transaction.id, 'identity');
  }

  if (sameDate && sameAmount && similarDescription && !sameRawDescription) {
    return candidate(transaction.id, 'fuzzy_description');
  }

  if (type === 'settlement' && sameAmount && similarDescription && !sameDate) {
    const dayDiff = Math.abs(differenceInCalendarDays(date, transaction.date));
    if (dayDiff > 0 && dayDiff <= IMPORT_MATCH_DATE_TOLERANCE_DAYS) {
      return candidate(transaction.id, 'date_tolerant');
    }
  }

  if (sameDate && similarDescription && !sameAmount) {
    const amountDiff = Math.abs(transaction.amount - amount);
    if (amountDiff > 0 && amountDiff <= IMPORT_MATCH_NEAR_AMOUNT_CENTS) {
      return candidate(transaction.id, 'near_amount');
    }
  }

  return null;
};
