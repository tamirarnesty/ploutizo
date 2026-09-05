import type { ImportTransactionType } from '@ploutizo/types';

export const IMPORT_MATCH_KIND_VALUES = [
  'external_id',
  'identity',
  'fuzzy_description',
  'date_tolerant',
  'near_amount',
] as const;

export type ImportMatchKind = (typeof IMPORT_MATCH_KIND_VALUES)[number];

export const EXACT_IMPORT_MATCH_KINDS = [
  'external_id',
  'identity',
] as const satisfies readonly ImportMatchKind[];

export type ExactImportMatchKind = (typeof EXACT_IMPORT_MATCH_KINDS)[number];

export const IMPORT_MATCH_DATE_TOLERANCE_DAYS = 7;
export const IMPORT_MATCH_NEAR_AMOUNT_CENTS = 100;
export const IMPORT_MATCH_FUZZY_DESCRIPTION_MIN_SIMILARITY = 0.5;

export type ImportMatchIssue =
  | 'collision'
  | 'invalidated_decision'
  | 'advisory_unresolved'
  | 'missing_target'
  | 'wrong_account'
  | 'deleted_target'
  | 'ambiguous_exact';

export interface ImportMatchDraftRow {
  id: string;
  externalId: string | null;
  reviewDate: string | null;
  parsedDate: string | null;
  reviewAmount: number | null;
  parsedAmount: number | null;
  reviewType: ImportTransactionType | null;
  parsedType: ImportTransactionType | null;
  reviewDescription: string | null;
  parsedDescription: string | null;
  sourceDescription: string | null;
  selectedForImport: boolean;
  reviewMatchedTransactionId: string | null;
  reviewMatchDismissed: boolean;
}

export interface ImportMatchCandidate {
  transactionId: string;
  kind: ImportMatchKind;
  explanation: string;
}

export interface ImportAcceptedMatch {
  transactionId: string;
  kind: ImportMatchKind;
}

export interface ImportMatchEvaluation {
  candidates: ImportMatchCandidate[];
  exactCandidate: ImportMatchCandidate | null;
  advisoryCandidates: ImportMatchCandidate[];
  collisionRowIds: string[];
  acceptedMatch: ImportAcceptedMatch | null;
  acceptedMatchValid: boolean;
  /** Unresolved match reasons. Drives the `match` status blocker. */
  issues: ImportMatchIssue[];
}
