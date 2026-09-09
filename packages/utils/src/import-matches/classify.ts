import { differenceInCalendarDays } from 'date-fns';
import type { ImportTransactionType, MatchTargetFact } from '@ploutizo/types';
import { resolveReviewedImportValues } from '../reviewed-import-values';
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

export interface ImportMatchRowFacts {
  externalId: string | null;
  type: ImportTransactionType | null;
  date: string | null;
  amount: number | null;
  description: string;
}

export const importMatchRowFacts = (
  row: ImportMatchDraftRow
): ImportMatchRowFacts => {
  const values = resolveReviewedImportValues(row);
  return {
    externalId: row.externalId?.trim() || null,
    type: values.type,
    date: values.date,
    amount: values.amount,
    description: normalizeImportMatchDescription(
      row.sourceDescription ?? row.parsedDescription
    ),
  };
};

export const importMatchTransactionDescription = (
  transaction: MatchTargetFact
): string =>
  normalizeImportMatchDescription(
    transaction.rawDescription ?? transaction.description
  );

export const classifyAgainstTransaction = (
  row: ImportMatchRowFacts,
  transaction: MatchTargetFact,
  txDescription: string
): ImportMatchCandidate | null => {
  const txExternalId = transaction.externalId?.trim() || null;
  if (row.externalId && txExternalId && row.externalId === txExternalId) {
    return candidate(transaction.id, 'external_id');
  }

  const { type, date, amount } = row;
  if (!type || !date || amount == null) return null;
  if (transaction.type !== type) return null;

  const sameDate = transaction.date === date;
  const sameAmount = transaction.amount === amount;
  const sameRawDescription = row.description === txDescription;

  if (!row.externalId && sameDate && sameAmount && sameRawDescription) {
    return candidate(transaction.id, 'identity');
  }

  const mightBeAdvisory =
    (sameDate && sameAmount && !sameRawDescription) ||
    (type === 'settlement' && sameAmount && !sameDate) ||
    (sameDate && !sameAmount);
  if (!mightBeAdvisory) return null;
  if (!importDescriptionsAreSimilar(row.description, txDescription)) {
    return null;
  }

  if (sameDate && sameAmount) {
    return candidate(transaction.id, 'fuzzy_description');
  }

  if (type === 'settlement' && sameAmount && !sameDate) {
    const dayDiff = Math.abs(differenceInCalendarDays(date, transaction.date));
    if (dayDiff > 0 && dayDiff <= IMPORT_MATCH_DATE_TOLERANCE_DAYS) {
      return candidate(transaction.id, 'date_tolerant');
    }
    return null;
  }

  const amountDiff = Math.abs(transaction.amount - amount);
  if (
    sameDate &&
    !sameAmount &&
    amountDiff > 0 &&
    amountDiff <= IMPORT_MATCH_NEAR_AMOUNT_CENTS
  ) {
    return candidate(transaction.id, 'near_amount');
  }

  return null;
};
