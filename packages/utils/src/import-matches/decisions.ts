import type { MatchTargetFact } from '@ploutizo/types';
import { toImportTransactionType } from '../import-row-status';
import type {
  ImportMatchCandidate,
  ImportMatchDraftRow,
  ImportMatchEvaluation,
  ImportMatchIssue,
} from './types';

export const savedDecisionIssues = (
  row: ImportMatchDraftRow,
  targetAccountId: string,
  transactionsById: ReadonlyMap<string, MatchTargetFact>,
  candidates: readonly ImportMatchCandidate[]
): { issues: ImportMatchIssue[]; acceptedMatchValid: boolean } => {
  const matchedId = row.reviewMatchedTransactionId;
  if (!matchedId) {
    return { issues: [], acceptedMatchValid: true };
  }

  const issues: ImportMatchIssue[] = [];
  const target = transactionsById.get(matchedId);
  if (!target) {
    issues.push('missing_target');
  } else {
    if (target.deleted) issues.push('deleted_target');
    if (target.accountId !== targetAccountId) issues.push('wrong_account');
  }

  const stillACandidate = candidates.some(
    (item) => item.transactionId === matchedId
  );
  if (!stillACandidate && issues.length === 0) {
    issues.push('invalidated_decision');
  }

  return { issues, acceptedMatchValid: issues.length === 0 };
};

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
  options: {
    targetAccountId: string;
    existingTransactions: readonly MatchTargetFact[];
  };
}

export const toImportMatchDraftRow = (row: {
  id: string;
  externalId?: string | null;
  reviewDate: string | null;
  parsedDate: string | null;
  reviewAmount: number | null;
  parsedAmount: number | null;
  reviewType: string | null;
  parsedType: string | null;
  reviewDescription: string | null;
  parsedDescription: string | null;
  sourceDescription?: string | null;
  selectedForImport: boolean;
  reviewMatchedTransactionId: string | null;
  reviewMatchDismissed: boolean;
}): ImportMatchDraftRow => ({
  id: row.id,
  externalId: row.externalId ?? null,
  reviewDate: row.reviewDate,
  parsedDate: row.parsedDate,
  reviewAmount: row.reviewAmount,
  parsedAmount: row.parsedAmount,
  reviewType: toImportTransactionType(row.reviewType),
  parsedType: toImportTransactionType(row.parsedType),
  reviewDescription: row.reviewDescription,
  parsedDescription: row.parsedDescription,
  sourceDescription: row.sourceDescription ?? null,
  selectedForImport: row.selectedForImport,
  reviewMatchedTransactionId: row.reviewMatchedTransactionId,
  reviewMatchDismissed: row.reviewMatchDismissed,
});

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
  const advisory =
    exactCandidate ||
    row.reviewMatchDismissed ||
    (row.reviewMatchedTransactionId && !savedMatchIsInvalid)
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
