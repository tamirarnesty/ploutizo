import { isImportPreparedProjectionOutcome } from '@ploutizo/types';
import type {
  ImportPreparedOutcome,
  ImportPreparedProjectionOutcome,
  ImportRequirementFailure,
  ImportRequirementKey,
  MatchTargetFact,
  PreparedImportRowSnapshot,
} from '@ploutizo/types';
import { evaluateImportMatches } from './import-matches';
import { evaluateImportRefundLinks } from './import-refund-links';
import { getLiveAssigneeMemberIds } from './import-row-readiness';
import {
  isImportRowStructurallyInvalid,
  toImportRowStatusFields,
} from './import-row-status';
import { toImportTransactionType } from './import-coercion';
import { resolveReviewedImportValues } from './reviewed-import-values';
import { buildPreparedImportRowSnapshot } from './prepared-import-snapshot';
import { validateTransactionAccountPolicy } from './transaction-policy';
import type {
  EvaluateImportRefundLinksOptions,
  ExistingRefundTargetExpense,
  ImportRefundLinkEvaluation,
  ImportRefundLinkIssue,
} from './import-refund-links';
import type { ImportDraftDurableRow } from './evaluate-import-draft';
import type { ImportMatchEvaluation, ImportMatchIssue } from './import-matches';
import type { TransactionAccountReference } from './transaction-policy';

const REFUND_REQUIREMENT_KEYS = {
  missing_target: 'import.refund_link.missing_target',
  wrong_account: 'import.refund_link.wrong_account',
  deleted_target: 'import.refund_link.deleted_target',
  not_expense: 'import.refund_link.not_expense',
  target_not_selected: 'import.refund_link.target_not_selected',
  target_not_expense: 'import.refund_link.target_not_expense',
  target_unfinalizable: 'import.refund_link.target_unfinalizable',
  cumulative_exceeds: 'import.refund_link.cumulative_exceeds',
  self_link: 'import.refund_link.self_link',
  dual_link: 'import.refund_link.dual_link',
} as const satisfies Record<ImportRefundLinkIssue, ImportRequirementKey>;

const MATCH_REQUIREMENT_KEYS = {
  collision: 'import.match.collision',
  invalidated_decision: 'import.match.invalidated_decision',
  advisory_unresolved: 'import.match.advisory_unresolved',
  missing_target: 'import.match.missing_target',
  wrong_account: 'import.match.wrong_account',
  deleted_target: 'import.match.deleted_target',
  ambiguous_exact: 'import.match.ambiguous_exact',
  duplicate_target: 'import.match.duplicate_target',
} as const satisfies Record<ImportMatchIssue, ImportRequirementKey>;

const ACCOUNT_REQUIREMENT_KEYS = {
  missing_account: 'transaction.account.missing',
  disallowed_account_type: 'transaction.account.disallowed_type',
  same_account_not_allowed: 'transaction.account.same_account_not_allowed',
} as const;

export interface ImportRequirementAccount {
  id: string;
  type: TransactionAccountReference['type'];
}

export interface ImportExternalFacts {
  rowCount: number;
  targetAccount: ImportRequirementAccount;
  counterpartAccounts: ReadonlyMap<string, ImportRequirementAccount>;
  validAssigneeMemberIds: ReadonlySet<string>;
  existingTransactions: readonly MatchTargetFact[];
  existingExpenses: ReadonlyMap<string, ExistingRefundTargetExpense>;
  priorRefundsByTarget?: ReadonlyMap<string, number>;
  activeExternalIdOwners?: ReadonlyMap<string, string>;
}

export type ImportContinueDraftFacts = ImportExternalFacts & {
  rows: readonly ImportDraftDurableRow[];
};

export interface PreparedImportOutcomeProjection {
  batchRowId: string;
  outcome: ImportPreparedProjectionOutcome;
  transactionId: string | null;
  snapshot: PreparedImportRowSnapshot;
}

export type VerifyImportSetForContinueResult =
  | { ready: true; projection: readonly PreparedImportOutcomeProjection[] }
  | { ready: false; failures: ImportRequirementFailure[] };

export interface PreparedImportSetRow {
  batchRowId: string;
  outcome: ImportPreparedOutcome;
  transactionId: string | null;
  snapshot: PreparedImportRowSnapshot;
}

export type ImportFinalizeExternalFacts = ImportExternalFacts;

export type VerifyPreparedImportSetForFinalizeResult =
  | { ready: true; verified: readonly PreparedImportSetRow[] }
  | { ready: false; failures: ImportRequirementFailure[] };

interface EvaluateImportSetRequirementsInput {
  rows: readonly ImportDraftDurableRow[];
  targetAccount: ImportRequirementAccount;
  counterpartAccounts: ReadonlyMap<string, ImportRequirementAccount>;
  validAssigneeMemberIds: ReadonlySet<string>;
  refundEvaluations: ReadonlyMap<string, ImportRefundLinkEvaluation>;
  matchEvaluations: ReadonlyMap<string, ImportMatchEvaluation>;
  activeExternalIdOwners?: ReadonlyMap<string, string>;
}

const failure = (
  batchRowId: string,
  key: ImportRequirementKey,
  params?: Record<string, unknown>
): ImportRequirementFailure =>
  params ? { batchRowId, key, params } : { batchRowId, key };

const toStatusFields = (row: ImportDraftDurableRow) =>
  toImportRowStatusFields({
    reviewDate: row.reviewDate,
    reviewAmount: row.reviewAmount,
    reviewType: toImportTransactionType(row.reviewType),
    reviewDescription: row.reviewDescription,
    parsedDate: row.parsedDate,
    parsedAmount: row.parsedAmount,
    parsedType: toImportTransactionType(row.parsedType),
    parsedDescription: row.parsedDescription,
    reviewCategoryId: row.reviewCategoryId,
    reviewAssigneeMemberIds: [...row.reviewAssigneeMemberIds],
    reviewCounterpartAccountId: row.reviewCounterpartAccountId,
  });

const evaluateCreateRequirements = (
  row: ImportDraftDurableRow,
  input: EvaluateImportSetRequirementsInput
): ImportRequirementFailure[] => {
  const failures: ImportRequirementFailure[] = [];
  const values = resolveReviewedImportValues(row);

  if (!values.date) failures.push(failure(row.id, 'transaction.date.required'));
  if (values.amount == null || values.amount <= 0) {
    failures.push(failure(row.id, 'transaction.amount.positive'));
  }
  if (!values.description) {
    failures.push(failure(row.id, 'transaction.description.required'));
  }
  if (!values.type) failures.push(failure(row.id, 'transaction.type.required'));

  if (values.type === 'expense' || values.type === 'refund') {
    if (!values.categoryId) {
      failures.push(failure(row.id, 'transaction.category.required'));
    }
  }

  const liveAssignees = getLiveAssigneeMemberIds(
    values.assigneeMemberIds,
    input.validAssigneeMemberIds
  );
  const unknownAssignees = values.assigneeMemberIds.filter(
    (memberId) => !input.validAssigneeMemberIds.has(memberId)
  );
  if (liveAssignees.length === 0) {
    failures.push(failure(row.id, 'transaction.assignee.required'));
  }
  if (unknownAssignees.length > 0) {
    failures.push(
      failure(row.id, 'transaction.assignee.unknown', {
        memberIds: unknownAssignees,
      })
    );
  }

  if (values.type) {
    const counterpart = values.counterpartAccountId
      ? (input.counterpartAccounts.get(values.counterpartAccountId) ?? null)
      : null;
    const policy = validateTransactionAccountPolicy({
      type: values.type,
      account: input.targetAccount,
      counterpartAccount: counterpart,
    });
    for (const violation of policy.violations) {
      failures.push(
        failure(row.id, ACCOUNT_REQUIREMENT_KEYS[violation.code], {
          field: violation.field,
        })
      );
    }
  }

  const refund = input.refundEvaluations.get(row.id);
  if (refund?.linked) {
    for (const issue of refund.issues) {
      failures.push(failure(row.id, REFUND_REQUIREMENT_KEYS[issue]));
    }
  }

  const externalId = row.externalId?.trim();
  if (externalId) {
    const ownerId = input.activeExternalIdOwners?.get(externalId);
    if (ownerId) {
      failures.push(
        failure(row.id, 'import.external_id.active_conflict', {
          transactionId: ownerId,
          externalId,
        })
      );
    }
  }

  return failures;
};

const evaluateImportSetRequirements = (
  input: EvaluateImportSetRequirementsInput
): ImportRequirementFailure[] => {
  const failures: ImportRequirementFailure[] = [];

  for (const row of input.rows) {
    if (!row.selectedForImport) continue;

    const match = input.matchEvaluations.get(row.id);
    for (const issue of match?.issues ?? []) {
      failures.push(failure(row.id, MATCH_REQUIREMENT_KEYS[issue]));
    }

    if (match?.acceptedMatch) continue;

    failures.push(...evaluateCreateRequirements(row, input));
  }

  return failures;
};

const projectImportPreparedOutcome = (
  row: ImportDraftDurableRow,
  match: ImportMatchEvaluation | undefined
): ImportPreparedProjectionOutcome => {
  if (row.selectedForImport && match?.acceptedMatch) return 'matched';
  if (isImportRowStructurallyInvalid(toStatusFields(row))) return 'invalid';
  if (!row.selectedForImport) return 'skipped';
  return 'created';
};

const buildRefundLinkOptions = (
  targetAccountId: string,
  facts: {
    existingExpenses: ReadonlyMap<string, ExistingRefundTargetExpense>;
    priorRefundsByTarget?: ReadonlyMap<string, number>;
  }
): EvaluateImportRefundLinksOptions => ({
  targetAccountId,
  existingExpenses: facts.existingExpenses,
  ...(facts.priorRefundsByTarget
    ? { priorRefundsByTarget: facts.priorRefundsByTarget }
    : {}),
});

const PREPARED_SET_UNKNOWN_ROW_ID = 'unknown';

const completenessFailure = (
  batchRowId: string | undefined
): ImportRequirementFailure =>
  failure(
    batchRowId ?? PREPARED_SET_UNKNOWN_ROW_ID,
    'import.match.invalidated_decision'
  );

/**
 * Reconstruct a durable row from the immutable snapshot for revalidation.
 * Match classification uses sourceDescription ?? parsedDescription, so those
 * come from provenance — never reviewedValues.description.
 *
 * Advisory unresolved is suppressed via evaluateImportMatches
 * `{ ignoreUnresolvedAdvisories: true }`, not by forging reviewMatchDismissed.
 */
const toFinalizeEvaluationRow = (
  row: PreparedImportSetRow
): ImportDraftDurableRow => {
  const { reviewedValues, provenance } = row.snapshot;
  const selectedForImport =
    row.outcome === 'created' || row.outcome === 'matched';

  return {
    id: row.batchRowId,
    reviewDate: reviewedValues.date,
    reviewAmount: reviewedValues.amount,
    reviewType: reviewedValues.type,
    reviewDescription: reviewedValues.description,
    parsedDate: reviewedValues.date,
    parsedAmount: reviewedValues.amount,
    parsedType: reviewedValues.type,
    parsedDescription: provenance.parsedDescription,
    reviewCategoryId: reviewedValues.categoryId,
    reviewAssigneeMemberIds: reviewedValues.assigneeMemberIds,
    reviewCounterpartAccountId: reviewedValues.counterpartAccountId,
    reviewRefundOf: reviewedValues.refundOf,
    reviewRefundOfBatchRowId: reviewedValues.refundOfBatchRowId,
    selectedForImport,
    externalId: provenance.externalId,
    sourceDescription: provenance.rawDescription,
    reviewMatchedTransactionId:
      row.outcome === 'matched' ? row.transactionId : null,
    reviewMatchDismissed: false,
  };
};

const verifyMatchedTransactionIds = (
  preparedRows: readonly PreparedImportSetRow[],
  matchEvaluations: ReadonlyMap<string, ImportMatchEvaluation>
): ImportRequirementFailure[] => {
  const failures: ImportRequirementFailure[] = [];

  for (const row of preparedRows) {
    if (row.outcome !== 'matched') continue;

    const acceptedMatch = matchEvaluations.get(row.batchRowId)?.acceptedMatch;
    if (!acceptedMatch) {
      failures.push(
        failure(row.batchRowId, 'import.match.invalidated_decision')
      );
      continue;
    }

    if (row.transactionId !== acceptedMatch.transactionId) {
      failures.push(
        failure(row.batchRowId, 'import.match.invalidated_decision')
      );
    }
  }

  return failures;
};

const verifyPreparedSetShape = (
  preparedRows: readonly PreparedImportSetRow[]
): ImportRequirementFailure[] => {
  const failures: ImportRequirementFailure[] = [];

  for (const row of preparedRows) {
    if (!isImportPreparedProjectionOutcome(row.outcome)) {
      failures.push(
        failure(row.batchRowId, 'import.match.invalidated_decision')
      );
      continue;
    }
    if (row.outcome === 'matched' && !row.transactionId) {
      failures.push(
        failure(row.batchRowId, 'import.match.invalidated_decision')
      );
    }
  }

  return failures;
};

/**
 * Continue gate: evaluate the selected Import set and project a complete
 * full-file prepared import set when ready.
 */
export const verifyImportSetForContinue = (
  draftFacts: ImportContinueDraftFacts
): VerifyImportSetForContinueResult => {
  const refundEvaluations = evaluateImportRefundLinks(
    draftFacts.rows,
    buildRefundLinkOptions(draftFacts.targetAccount.id, draftFacts)
  );
  const matchEvaluations = evaluateImportMatches(draftFacts.rows, {
    targetAccountId: draftFacts.targetAccount.id,
    existingTransactions: draftFacts.existingTransactions,
  });

  const failures = evaluateImportSetRequirements({
    rows: draftFacts.rows,
    targetAccount: draftFacts.targetAccount,
    counterpartAccounts: draftFacts.counterpartAccounts,
    validAssigneeMemberIds: draftFacts.validAssigneeMemberIds,
    refundEvaluations,
    matchEvaluations,
    activeExternalIdOwners: draftFacts.activeExternalIdOwners,
  });

  if (failures.length > 0) {
    return { ready: false, failures };
  }

  const projection = draftFacts.rows.map((row) => {
    const match = matchEvaluations.get(row.id);
    const outcome = projectImportPreparedOutcome(row, match);
    return {
      batchRowId: row.id,
      outcome,
      transactionId:
        outcome === 'matched'
          ? (match?.acceptedMatch?.transactionId ?? null)
          : null,
      snapshot: buildPreparedImportRowSnapshot(row),
    };
  });

  if (projection.length !== draftFacts.rowCount) {
    return {
      ready: false,
      failures: [completenessFailure(draftFacts.rows[0]?.id)],
    };
  }

  return { ready: true, projection };
};

/**
 * Finalize gate: revalidate immutable prepared snapshots against current
 * external facts without consulting mutable draft values.
 */
export const verifyPreparedImportSetForFinalize = (
  preparedRows: readonly PreparedImportSetRow[],
  currentExternalFacts: ImportFinalizeExternalFacts
): VerifyPreparedImportSetForFinalizeResult => {
  if (preparedRows.length !== currentExternalFacts.rowCount) {
    return {
      ready: false,
      failures: [completenessFailure(preparedRows[0]?.batchRowId)],
    };
  }

  const shapeFailures = verifyPreparedSetShape(preparedRows);
  if (shapeFailures.length > 0) {
    return { ready: false, failures: shapeFailures };
  }

  const evaluationRows = preparedRows.map(toFinalizeEvaluationRow);
  const refundEvaluations = evaluateImportRefundLinks(
    evaluationRows,
    buildRefundLinkOptions(
      currentExternalFacts.targetAccount.id,
      currentExternalFacts
    )
  );
  const matchEvaluations = evaluateImportMatches(evaluationRows, {
    targetAccountId: currentExternalFacts.targetAccount.id,
    existingTransactions: currentExternalFacts.existingTransactions,
    ignoreUnresolvedAdvisories: true,
  });

  const failures = [
    ...evaluateImportSetRequirements({
      rows: evaluationRows,
      targetAccount: currentExternalFacts.targetAccount,
      counterpartAccounts: currentExternalFacts.counterpartAccounts,
      validAssigneeMemberIds: currentExternalFacts.validAssigneeMemberIds,
      refundEvaluations,
      matchEvaluations,
      activeExternalIdOwners: currentExternalFacts.activeExternalIdOwners,
    }),
    ...verifyMatchedTransactionIds(preparedRows, matchEvaluations),
  ];

  if (failures.length > 0) {
    return { ready: false, failures };
  }

  return { ready: true, verified: preparedRows };
};
