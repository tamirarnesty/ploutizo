import {
  isImportContentProfileId,
  toFinancialInstitutionId,
} from '@ploutizo/types';
import type {
  ImportCompletedHistoryItem,
  ImportCompletedResult,
  ImportContentProfileId,
  ImportDiscardedHistoryItem,
  ImportDraftSummary,
  ImportHistoryIdentity,
  ImportHistoryItem,
  ImportTargetAccount,
} from '@ploutizo/types';
import type { ImportDraftSummaryRow } from '@/lib/queries/imports';
import { DomainError } from '@/lib/errors';

const toContentProfileId = (
  contentProfileId: string | null
): ImportContentProfileId | null => {
  if (contentProfileId == null) return null;
  if (!isImportContentProfileId(contentProfileId)) {
    throw new DomainError(500, 'Import draft has an unknown content profile.');
  }
  return contentProfileId;
};

export const toImportAccount = (
  row: Pick<
    ImportDraftSummaryRow,
    'accountId' | 'accountName' | 'accountInstitutionId' | 'accountLastFour'
  >
): ImportTargetAccount => {
  if (!row.accountId) {
    throw new DomainError(500, 'Import draft is missing an account.');
  }
  return {
    id: row.accountId,
    name: row.accountName,
    institutionId: toFinancialInstitutionId(row.accountInstitutionId),
    lastFour: row.accountLastFour,
  };
};

const toImportHistoryIdentity = (
  row: ImportDraftSummaryRow
): ImportHistoryIdentity => ({
  id: row.id,
  account: toImportAccount(row),
  contentProfileId: toContentProfileId(row.contentProfileId),
  fileName: row.fileName,
  rowCount: row.rowCount,
  importedAt: row.importedAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const toImportDraftSummary = (
  row: ImportDraftSummaryRow
): ImportDraftSummary => ({
  ...toImportHistoryIdentity(row),
  status: row.status,
  validRowCount: 0,
  invalidRowCount: 0,
  completedAt: row.completedAt?.toISOString() ?? null,
  discardedAt: row.discardedAt?.toISOString() ?? null,
});

const requireCompletedCounts = (row: ImportDraftSummaryRow) => {
  if (
    row.createdCount == null ||
    row.matchedCount == null ||
    row.skippedCount == null ||
    row.invalidCount == null ||
    !row.completedAt ||
    !row.finalizedPreparedSetId
  ) {
    throw new DomainError(500, 'Completed import is missing result facts.');
  }
  return {
    createdCount: row.createdCount,
    matchedCount: row.matchedCount,
    skippedCount: row.skippedCount,
    invalidCount: row.invalidCount,
    completedAt: row.completedAt,
    preparedSetId: row.finalizedPreparedSetId,
  };
};

export const toImportCompletedResult = (
  row: ImportDraftSummaryRow
): ImportCompletedResult => {
  const counts = requireCompletedCounts(row);
  return {
    ...toImportHistoryIdentity(row),
    status: 'completed',
    completedAt: counts.completedAt.toISOString(),
    discardedAt: null,
    createdCount: counts.createdCount,
    matchedCount: counts.matchedCount,
    skippedCount: counts.skippedCount,
    invalidCount: counts.invalidCount,
    preparedSetId: counts.preparedSetId,
  };
};

export const toImportCompletedHistoryItem = (
  row: ImportDraftSummaryRow
): ImportCompletedHistoryItem => {
  const { preparedSetId: _preparedSetId, ...item } =
    toImportCompletedResult(row);
  return item;
};

export const toImportDiscardedHistoryItem = (
  row: ImportDraftSummaryRow
): ImportDiscardedHistoryItem => {
  if (!row.discardedAt) {
    throw new DomainError(500, 'Discarded import is missing discardedAt.');
  }
  return {
    ...toImportHistoryIdentity(row),
    status: 'discarded',
    completedAt: null,
    discardedAt: row.discardedAt.toISOString(),
  };
};

export const toImportHistoryItem = (
  row: ImportDraftSummaryRow
): ImportHistoryItem => {
  if (row.status === 'completed') return toImportCompletedHistoryItem(row);
  if (row.status === 'discarded') return toImportDiscardedHistoryItem(row);
  throw new DomainError(500, 'Import history only includes closed batches.');
};
