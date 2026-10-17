import { isImportRequirementKey } from '@ploutizo/utils/import-requirements';
import type {
  ImportRequirementFailure,
  ImportRequirementFailureDetails,
  ImportRequirementKey,
} from '@ploutizo/types';
import { getApiErrorCode, getApiErrorMessage } from '@/lib/queryClient';
import type { ApiErrorBody } from '@/lib/queryClient';

export const IMPORT_CONTINUE_NOT_READY = 'IMPORT_CONTINUE_NOT_READY';
export const IMPORT_CONTINUE_NONE_SELECTED = 'IMPORT_CONTINUE_NONE_SELECTED';
export const IMPORT_FINALIZE_NOT_READY = 'IMPORT_FINALIZE_NOT_READY';
export const IMPORT_FINALIZE_STALE = 'IMPORT_FINALIZE_STALE';
export const IMPORT_FINALIZE_CONFLICT = 'IMPORT_FINALIZE_CONFLICT';

const REQUIREMENT_COPY: Record<ImportRequirementKey, string> = {
  'transaction.date.required': 'Enter a date.',
  'transaction.amount.positive': 'Enter an amount greater than zero.',
  'transaction.description.required': 'Enter a description.',
  'transaction.type.required': 'Choose expense, refund, or settlement.',
  'transaction.category.required': 'Choose a category.',
  'transaction.category.unknown':
    'This category was removed from the household. Choose another category.',
  'transaction.tag.unknown':
    'A tag was removed from the household. Remove it from this row.',
  'transaction.assignee.required': 'Choose at least one assignee.',
  'transaction.assignee.unknown':
    'An assignee left the household. Choose another assignee.',
  'transaction.account.missing': 'Choose the account this was paid from.',
  'transaction.account.disallowed_type':
    'Choose a chequing or savings account to pay from.',
  'transaction.account.same_account_not_allowed':
    'Choose a different account to pay from than this card.',
  'import.refund_link.missing_target':
    'The linked expense no longer exists. Deselect this row.',
  'import.refund_link.wrong_account':
    'The linked expense is on another card. Deselect this row.',
  'import.refund_link.deleted_target':
    'The linked expense was deleted. Deselect this row.',
  'import.refund_link.not_expense':
    'The linked transaction is not an expense. Deselect this row.',
  'import.refund_link.target_not_selected':
    'Select the linked expense row for import, or deselect this row.',
  'import.refund_link.target_not_expense':
    'Change the linked row to an expense, or deselect this row.',
  'import.refund_link.target_unfinalizable':
    'Fix the linked expense row first, or deselect this row.',
  'import.refund_link.cumulative_exceeds':
    'Lower the refund amount so linked refunds don’t exceed the expense.',
  'import.refund_link.self_link':
    'This refund is linked to itself. Deselect this row.',
  'import.refund_link.dual_link':
    'This refund is linked to two expenses. Deselect this row.',
  'import.match.collision':
    'Several rows share this external ID. Select only one of them.',
  'import.match.invalidated_decision':
    'The accepted match changed. Review the match again.',
  'import.match.advisory_unresolved':
    'Choose “Use this match” or “Not a match”.',
  'import.match.missing_target':
    'The matched transaction no longer exists. Clear the match.',
  'import.match.wrong_account':
    'The matched transaction is on another account. Clear the match.',
  'import.match.deleted_target':
    'The matched transaction was deleted. Clear the match.',
  'import.match.ambiguous_exact':
    'Several transactions match this row exactly. Choose one or mark it “Not a match”.',
  'import.match.duplicate_target':
    'Another selected row already matches this transaction. Deselect one of them.',
  'import.external_id.active_conflict':
    'A transaction with this external ID already exists. Deselect this row.',
};

const DOMAIN_ISSUE_CODES = new Set([
  IMPORT_CONTINUE_NOT_READY,
  IMPORT_FINALIZE_NOT_READY,
  IMPORT_FINALIZE_STALE,
]);

const STALE_RETURN_CODES = new Set([
  IMPORT_FINALIZE_STALE,
  IMPORT_FINALIZE_CONFLICT,
  IMPORT_FINALIZE_NOT_READY,
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toRequirementKey = (value: unknown): ImportRequirementKey | null =>
  typeof value === 'string' && isImportRequirementKey(value) ? value : null;

const toRequirementFailure = (
  value: unknown
): ImportRequirementFailure | null => {
  if (!isRecord(value) || typeof value.batchRowId !== 'string') return null;
  const key = toRequirementKey(value.key);
  if (!key) return null;
  const params = isRecord(value.params) ? value.params : undefined;
  return params
    ? { batchRowId: value.batchRowId, key, params }
    : { batchRowId: value.batchRowId, key };
};

export const getImportRequirementCopy = (key: ImportRequirementKey): string =>
  REQUIREMENT_COPY[key];

export const getImportContinueNotReadyDetails = (
  details: unknown
): ImportRequirementFailureDetails | null => {
  if (!isRecord(details) || !Array.isArray(details.rows)) return null;
  const rows = details.rows
    .map(toRequirementFailure)
    .filter((row): row is ImportRequirementFailure => row !== null);
  return rows.length > 0 ? { rows } : null;
};

export const getImportRequirementFailures = (
  error: unknown
): ImportRequirementFailure[] => {
  const body = error as ApiErrorBody;
  return getImportContinueNotReadyDetails(body.error?.details)?.rows ?? [];
};

export const summarizeImportRequirementIssues = (
  failures: readonly ImportRequirementFailure[]
): string => {
  const reasons = [
    ...new Set(failures.map((row) => getImportRequirementCopy(row.key))),
  ];
  return reasons.join(' ');
};

export const getImportRequirementIssueRowIds = (
  failures: readonly ImportRequirementFailure[]
): string[] => [...new Set(failures.map((row) => row.batchRowId))];

export const isImportDomainIssueError = (error: unknown): boolean => {
  const code = getApiErrorCode(error);
  return code !== undefined && DOMAIN_ISSUE_CODES.has(code);
};

export const isImportStaleFinalizeError = (error: unknown): boolean => {
  const code = getApiErrorCode(error);
  return code !== undefined && STALE_RETURN_CODES.has(code);
};

export const getImportContinueGateMessage = (error: unknown): string => {
  const code = getApiErrorCode(error);
  if (code === 'VALIDATION_ERROR') {
    return 'Unable to prepare this import. Reload the page and try again.';
  }
  if (code && DOMAIN_ISSUE_CODES.has(code)) {
    const summary = summarizeImportRequirementIssues(
      getImportRequirementFailures(error)
    );
    if (summary) return summary;
  }

  return getApiErrorMessage(
    error,
    code === IMPORT_CONTINUE_NONE_SELECTED
      ? 'Select at least one row to continue.'
      : 'Could not prepare this import for finalize.'
  );
};
