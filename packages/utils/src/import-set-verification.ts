import type {
  ImportRequirementFailure,
  ImportRequirementKey,
  ImportRowOutcome,
  ImportRowSnapshot,
  MatchTargetFact,
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
import { buildImportRowSnapshot } from './import-row-snapshot';
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

export type ImportSetFacts = ImportExternalFacts & {
  rows: readonly ImportDraftDurableRow[];
};

export interface ImportRowProjection {
  batchRowId: string;
  outcome: ImportRowOutcome;
  transactionId: string | null;
  snapshot: ImportRowSnapshot;
}

export type VerifyImportSetResult =
  | { ready: true; projection: readonly ImportRowProjection[] }
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
    // Archive-date availability is not applied here; import settlement
    // funding stays on account-type policy only (PLO-45 fence).
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

const projectImportRowOutcome = (
  row: ImportDraftDurableRow,
  match: ImportMatchEvaluation | undefined
): ImportRowOutcome => {
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
const UNKNOWN_ROW_ID = 'unknown';

const completenessFailure = (
  batchRowId: string | undefined
): ImportRequirementFailure =>
  failure(batchRowId ?? UNKNOWN_ROW_ID, 'import.match.invalidated_decision');

/**
 * Import set verification shared by Continue and Finalize: evaluate the
 * selected import set and project a complete full-file outcome per source row.
 */
export const verifyImportSet = (
  facts: ImportSetFacts
): VerifyImportSetResult => {
  const refundEvaluations = evaluateImportRefundLinks(
    facts.rows,
    buildRefundLinkOptions(facts.targetAccount.id, facts)
  );
  const matchEvaluations = evaluateImportMatches(facts.rows, {
    targetAccountId: facts.targetAccount.id,
    existingTransactions: facts.existingTransactions,
  });

  const failures = evaluateImportSetRequirements({
    rows: facts.rows,
    targetAccount: facts.targetAccount,
    counterpartAccounts: facts.counterpartAccounts,
    validAssigneeMemberIds: facts.validAssigneeMemberIds,
    refundEvaluations,
    matchEvaluations,
    activeExternalIdOwners: facts.activeExternalIdOwners,
  });

  if (failures.length > 0) {
    return { ready: false, failures };
  }

  const projection = facts.rows.map((row) => {
    const match = matchEvaluations.get(row.id);
    const outcome = projectImportRowOutcome(row, match);
    return {
      batchRowId: row.id,
      outcome,
      transactionId:
        outcome === 'matched'
          ? (match?.acceptedMatch?.transactionId ?? null)
          : null,
      snapshot: buildImportRowSnapshot(row),
    };
  });

  if (projection.length !== facts.rowCount) {
    return {
      ready: false,
      failures: [completenessFailure(facts.rows[0]?.id)],
    };
  }

  return { ready: true, projection };
};
