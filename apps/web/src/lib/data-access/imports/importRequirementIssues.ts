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
  'transaction.date.required': 'Date is required.',
  'transaction.amount.positive': 'Amount must be a positive number.',
  'transaction.description.required': 'Description is required.',
  'transaction.type.required': 'Type must be expense, refund, or settlement.',
  'transaction.category.required': 'Category is required.',
  'transaction.assignee.required': 'At least one assignee is required.',
  'transaction.assignee.unknown': 'An assignee is no longer in this household.',
  'transaction.account.missing': 'A required account is missing.',
  'transaction.account.disallowed_type':
    'The selected account type is not allowed.',
  'transaction.account.same_account_not_allowed':
    'Transaction account and counterpart account must differ.',
  'import.refund_link.missing_target': 'Refund link target was not found.',
  'import.refund_link.wrong_account': 'Refund link target is not on this card.',
  'import.refund_link.deleted_target': 'Refund link target was deleted.',
  'import.refund_link.not_expense': 'Refund link target is not an expense.',
  'import.refund_link.target_not_selected':
    'Same-import refund target must be selected.',
  'import.refund_link.target_not_expense':
    'Same-import refund target must be an expense.',
  'import.refund_link.target_unfinalizable':
    'Same-import refund target is not ready to import.',
  'import.refund_link.cumulative_exceeds':
    'Linked refunds exceed the original expense amount.',
  'import.refund_link.self_link': 'A refund cannot link to itself.',
  'import.refund_link.dual_link':
    'A refund cannot link to both an existing expense and a same-import row.',
  'import.match.collision':
    'Select exactly one row for this duplicate external id.',
  'import.match.invalidated_decision': 'The accepted match is no longer valid.',
  'import.match.advisory_unresolved': 'This row still needs match review.',
  'import.match.missing_target': 'The matched transaction was not found.',
  'import.match.wrong_account': 'The matched transaction is not on this card.',
  'import.match.deleted_target': 'The matched transaction was deleted.',
  'import.match.ambiguous_exact':
    'Multiple exact matches were found for this row.',
  'import.match.duplicate_target':
    'Another selected row already matches this transaction.',
  'import.external_id.active_conflict':
    'An active transaction already uses this external id.',
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
