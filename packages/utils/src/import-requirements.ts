import { IMPORT_REQUIREMENT_KEY_VALUES } from '@ploutizo/types';
import type {
  ImportPreparedProjectionOutcome,
  ImportRequirementFailure,
  ImportRequirementKey,
} from '@ploutizo/types';
import { getLiveAssigneeMemberIds } from './import-row-readiness';
import {
  isImportRowStructurallyInvalid,
  resolveImportRowReviewAmount,
  resolveImportRowReviewDate,
  resolveImportRowReviewDescription,
  resolveImportRowReviewType,
  toImportRowStatusFields,
  toImportTransactionType,
} from './import-row-status';
import { validateTransactionAccountPolicy } from './transaction-policy';
import type { TransactionAccountReference } from './transaction-policy';
import type { ImportDraftDurableRow } from './evaluate-import-draft';
import type { ImportMatchEvaluation, ImportMatchIssue } from './import-matches';
import type {
  ImportRefundLinkEvaluation,
  ImportRefundLinkIssue,
} from './import-refund-links';

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

export interface EvaluateImportSetRequirementsInput {
  rows: readonly ImportDraftDurableRow[];
  targetAccount: ImportRequirementAccount;
  counterpartAccounts: ReadonlyMap<string, ImportRequirementAccount>;
  validAssigneeMemberIds: ReadonlySet<string>;
  refundEvaluations: ReadonlyMap<string, ImportRefundLinkEvaluation>;
  matchEvaluations: ReadonlyMap<string, ImportMatchEvaluation>;
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
  const fields = toStatusFields(row);
  const date = resolveImportRowReviewDate(fields);
  const amount = resolveImportRowReviewAmount(fields);
  const description = resolveImportRowReviewDescription(fields);
  const type = resolveImportRowReviewType(fields);

  if (!date) failures.push(failure(row.id, 'transaction.date.required'));
  if (amount == null || amount <= 0) {
    failures.push(failure(row.id, 'transaction.amount.positive'));
  }
  if (!description) {
    failures.push(failure(row.id, 'transaction.description.required'));
  }
  if (!type) failures.push(failure(row.id, 'transaction.type.required'));

  if (type === 'expense' || type === 'refund') {
    if (!row.reviewCategoryId) {
      failures.push(failure(row.id, 'transaction.category.required'));
    }
  }

  const liveAssignees = getLiveAssigneeMemberIds(
    row.reviewAssigneeMemberIds,
    input.validAssigneeMemberIds
  );
  const unknownAssignees = row.reviewAssigneeMemberIds.filter(
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

  if (type) {
    const counterpart = row.reviewCounterpartAccountId
      ? (input.counterpartAccounts.get(row.reviewCounterpartAccountId) ?? null)
      : null;
    const policy = validateTransactionAccountPolicy({
      type,
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

  return failures;
};

/**
 * Shared transaction requirements composed with import-specific requirements.
 * Used by Continue today; Finalize will reuse the same evaluator. Only selected
 * rows are evaluated — unselected rows are outside the Import set.
 */
export const evaluateImportSetRequirements = (
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

export const projectImportPreparedOutcome = (
  row: ImportDraftDurableRow,
  match: ImportMatchEvaluation | undefined
): ImportPreparedProjectionOutcome => {
  if (isImportRowStructurallyInvalid(toStatusFields(row))) return 'invalid';
  if (!row.selectedForImport) return 'skipped';
  if (match?.acceptedMatch) return 'matched';
  return 'created';
};

export const isImportRequirementKey = (
  value: string
): value is ImportRequirementKey =>
  (IMPORT_REQUIREMENT_KEY_VALUES as readonly string[]).includes(value);
