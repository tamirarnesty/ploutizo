import type { ImportRowStatus } from '@ploutizo/types';

export interface ImportRowSelectionFields {
  status: ImportRowStatus;
  selectedForImport: boolean;
  reviewAssigneeMemberIds: readonly string[];
}

export interface ImportReviewContinueOptions {
  /** When set, assignees must resolve to at least one live org member. */
  validAssigneeMemberIds?: ReadonlySet<string>;
}

export const isImportRowSelectable = (
  row: Pick<ImportRowSelectionFields, 'status'>
): boolean => row.status !== 'invalid';

export const isImportRowResolved = (
  row: Pick<ImportRowSelectionFields, 'status'>
): boolean => row.status === 'ready';

/** Assignee ids that still exist in the live org member set. */
export const getLiveAssigneeMemberIds = (
  reviewAssigneeMemberIds: readonly string[],
  validAssigneeMemberIds: ReadonlySet<string>
): string[] =>
  reviewAssigneeMemberIds.filter((id) => validAssigneeMemberIds.has(id));

export const rowHasLiveAssignee = (
  row: Pick<ImportRowSelectionFields, 'reviewAssigneeMemberIds'>,
  validAssigneeMemberIds?: ReadonlySet<string>
): boolean => {
  if (!validAssigneeMemberIds) {
    return row.reviewAssigneeMemberIds.length > 0;
  }
  return (
    getLiveAssigneeMemberIds(
      row.reviewAssigneeMemberIds,
      validAssigneeMemberIds
    ).length > 0
  );
};

/** Selected rows may continue when derived status is ready (and assignees live). */
export const isImportRowReadyForImport = (
  row: Pick<ImportRowSelectionFields, 'status' | 'reviewAssigneeMemberIds'>,
  options?: ImportReviewContinueOptions
): boolean => {
  if (!isImportRowResolved(row)) return false;
  if (!options?.validAssigneeMemberIds) return true;
  return rowHasLiveAssignee(row, options.validAssigneeMemberIds);
};

export const getSelectedImportRows = <T extends ImportRowSelectionFields>(
  rows: readonly T[]
): T[] => rows.filter((row) => row.selectedForImport);

export const getSelectableImportRows = <T extends ImportRowSelectionFields>(
  rows: readonly T[]
): T[] => rows.filter(isImportRowSelectable);

/**
 * Continue gate for Review import. Client gating is selection-only so the
 * server can return authoritative requirement failures. Persistence and
 * in-flight Continue state are gated by the Review UI, not this helper.
 */
export const canContinueImportReview = (
  rows: readonly ImportRowSelectionFields[],
  _options?: ImportReviewContinueOptions
): boolean => getSelectedImportRows(rows).length > 0;

export type ImportReviewContinueBlockerReason = { kind: 'none_selected' };

export const getImportReviewContinueBlockerReason = (
  rows: readonly ImportRowSelectionFields[],
  _options?: ImportReviewContinueOptions
): ImportReviewContinueBlockerReason | null =>
  getSelectedImportRows(rows).length === 0 ? { kind: 'none_selected' } : null;

/** Default English copy for continue gating; UI may map reasons for i18n later. */
export const formatImportReviewContinueBlocker = (
  _reason: ImportReviewContinueBlockerReason
): string => 'Select at least one row to continue.';

export const getImportReviewContinueBlocker = (
  rows: readonly ImportRowSelectionFields[],
  options?: ImportReviewContinueOptions
): string | null => {
  const reason = getImportReviewContinueBlockerReason(rows, options);
  return reason ? formatImportReviewContinueBlocker(reason) : null;
};
