import type { MatchTargetFact } from '@ploutizo/types';
import { evaluateImportMatches } from './evaluate';
import type { ImportMatchDraftRowSource } from './evaluate';
import type {
  ImportMatchCandidate,
  ImportMatchDraftRow,
  ImportMatchEvaluation,
  ImportMatchIssue,
} from './types';

export const matchDecisionForSelectionChange = (input: {
  selectedForImport: boolean;
  currentMatchedTransactionId: string | null;
  exactCandidate: ImportMatchCandidate | null;
  collisionUnresolved?: boolean;
}): string | null => {
  if (!input.selectedForImport) return null;
  if (input.currentMatchedTransactionId) {
    return input.currentMatchedTransactionId;
  }
  if (input.collisionUnresolved) return null;
  return input.exactCandidate?.transactionId ?? null;
};

export interface MatchDecisionsForSelectedRowsInput {
  rowIds: readonly string[];
  selectedForImport: boolean;
  targetAccountId: string;
  existingTransactions: readonly MatchTargetFact[];
}

/** Derive saved match IDs after selection changes. Rows must already reflect the new selection. */
export const matchDecisionsForSelectedRows = (
  rows: readonly ImportMatchDraftRowSource[],
  input: MatchDecisionsForSelectedRowsInput
): Map<string, string | null> => {
  const evaluations = evaluateImportMatches(rows, {
    targetAccountId: input.targetAccountId,
    existingTransactions: input.existingTransactions,
  });
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const patches = new Map<string, string | null>();

  for (const rowId of input.rowIds) {
    const row = rowsById.get(rowId);
    if (!row) continue;
    const evaluation = evaluations.get(rowId);
    patches.set(
      rowId,
      matchDecisionForSelectionChange({
        selectedForImport: input.selectedForImport,
        currentMatchedTransactionId: row.reviewMatchedTransactionId,
        exactCandidate: evaluation?.exactCandidate ?? null,
        collisionUnresolved: evaluation?.issues.includes('collision') ?? false,
      })
    );
  }

  return patches;
};

export type ImportMatchReviewAction =
  | 'accept_advisory'
  | 'dismiss_match'
  | 'clear_invalid_match';

export interface ImportMatchReviewUiState {
  issues: ImportMatchIssue[];
  exactExplanation: string | null;
  advisory: ImportMatchCandidate | null;
  actions: ImportMatchReviewAction[];
}

export const deriveImportMatchReviewUiState = (
  row: Pick<
    ImportMatchDraftRow,
    'reviewMatchedTransactionId' | 'reviewMatchDismissed'
  >,
  match: ImportMatchEvaluation | null | undefined
): ImportMatchReviewUiState => {
  const exactCandidate = match?.exactCandidate ?? null;
  const savedMatchIsInvalid =
    Boolean(row.reviewMatchedTransactionId) &&
    match?.acceptedMatchValid === false;
  const keepAdvisoryHidden =
    Boolean(exactCandidate) ||
    row.reviewMatchDismissed ||
    (Boolean(row.reviewMatchedTransactionId) && !savedMatchIsInvalid);
  const advisory = keepAdvisoryHidden
    ? null
    : (match?.advisoryCandidates[0] ?? null);

  const actions: ImportMatchReviewAction[] = [];
  if (advisory) {
    actions.push('accept_advisory', 'dismiss_match');
  } else if (savedMatchIsInvalid) {
    actions.push('clear_invalid_match');
  }

  return {
    issues: match?.issues ?? [],
    exactExplanation: exactCandidate?.explanation ?? null,
    advisory,
    actions,
  };
};
