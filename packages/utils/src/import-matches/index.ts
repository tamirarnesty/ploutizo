export {
  IMPORT_MATCH_KIND_VALUES,
  EXACT_IMPORT_MATCH_KINDS,
  IMPORT_MATCH_DATE_TOLERANCE_DAYS,
  IMPORT_MATCH_NEAR_AMOUNT_CENTS,
  IMPORT_MATCH_FUZZY_DESCRIPTION_MIN_SIMILARITY,
  type ImportMatchKind,
  type ExactImportMatchKind,
  type ImportMatchIssue,
  type ImportMatchDraftRow,
  type ImportMatchCandidate,
  type ImportAcceptedMatch,
  type ImportMatchEvaluation,
} from './types';

export {
  normalizeImportMatchDescription,
  importDescriptionsAreSimilar,
} from './description';

export { classifyAgainstTransaction, isExactImportMatchKind } from './classify';

export { collisionGroups } from './collisions';

export {
  collectMatchedTransactionIds,
  importMatchTargetQueryBounds,
  importMatchTargetQueryInput,
  type ImportMatchTargetQueryBounds,
  type ImportMatchTargetQueryInput,
} from './query-bounds';

export {
  evaluateImportMatches,
  type EvaluateImportMatchesOptions,
  type ImportMatchDraftRowSource,
} from './evaluate';

export {
  matchDecisionForSelectionChange,
  matchDecisionsForSelectedRows,
  deriveImportMatchReviewUiState,
  type MatchDecisionsForSelectedRowsInput,
  type ImportMatchReviewAction,
  type ImportMatchReviewUiState,
} from './decisions';

export { IMPORT_MATCH_ISSUE_COPY } from './presentation';
