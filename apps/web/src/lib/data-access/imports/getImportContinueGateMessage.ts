import type {
  ImportContinueNotReadyDetails,
  ImportContinueNotReadyRow,
  ImportRowReviewBlocker,
  ImportRowStatus,
} from '@ploutizo/types';
import type { ApiErrorBody } from '@/lib/queryClient';
import { getApiErrorMessage } from '@/lib/queryClient';

export const IMPORT_CONTINUE_NOT_READY = 'IMPORT_CONTINUE_NOT_READY';
export const IMPORT_CONTINUE_NONE_SELECTED = 'IMPORT_CONTINUE_NONE_SELECTED';

const IMPORT_ROW_STATUS_VALUES = new Set<ImportRowStatus>([
  'ready',
  'needs_review',
  'invalid',
  'skipped',
]);

const IMPORT_ROW_REVIEW_BLOCKERS = new Set<ImportRowReviewBlocker>([
  'date',
  'amount',
  'description',
  'type',
  'category',
  'assignee',
  'settlement',
  'refund_link',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toImportRowStatus = (value: unknown): ImportRowStatus | null =>
  typeof value === 'string' &&
  IMPORT_ROW_STATUS_VALUES.has(value as ImportRowStatus)
    ? (value as ImportRowStatus)
    : null;

const toReviewBlockers = (value: unknown): ImportRowReviewBlocker[] =>
  Array.isArray(value)
    ? value.filter(
        (blocker): blocker is ImportRowReviewBlocker =>
          typeof blocker === 'string' &&
          IMPORT_ROW_REVIEW_BLOCKERS.has(blocker as ImportRowReviewBlocker)
      )
    : [];

const toContinueNotReadyRow = (
  value: unknown
): ImportContinueNotReadyRow | null => {
  if (!isRecord(value) || typeof value.batchRowId !== 'string') return null;
  const status = toImportRowStatus(value.status);
  if (!status) return null;
  return {
    batchRowId: value.batchRowId,
    status,
    blockers: toReviewBlockers(value.blockers),
    invalidReason:
      typeof value.invalidReason === 'string' ? value.invalidReason : null,
  };
};

export const getImportContinueNotReadyDetails = (
  details: unknown
): ImportContinueNotReadyDetails | null => {
  if (!isRecord(details) || !Array.isArray(details.rows)) return null;
  const rows = details.rows
    .map(toContinueNotReadyRow)
    .filter((row): row is ImportContinueNotReadyRow => row !== null);
  return rows.length > 0 ? { rows } : null;
};

export const getImportContinueGateMessage = (error: unknown): string => {
  const body = error as ApiErrorBody;
  const code = body.error?.code;
  if (code === IMPORT_CONTINUE_NOT_READY) {
    const details = getImportContinueNotReadyDetails(body.error?.details);
    const reasons = [
      ...new Set(
        (details?.rows ?? [])
          .map((row) => row.invalidReason)
          .filter((reason): reason is string => Boolean(reason))
      ),
    ];
    if (reasons.length > 0) return reasons.join(' ');
  }

  return getApiErrorMessage(
    error,
    code === IMPORT_CONTINUE_NONE_SELECTED
      ? 'Select at least one row to continue.'
      : 'Could not prepare this import for finalize.'
  );
};
