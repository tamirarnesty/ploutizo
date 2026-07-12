import { computeImportRowStatus } from '@ploutizo/utils/import-row-status';
import type {
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
} from '@ploutizo/types';
import { activeImportDraftsQueryKey, importDraftQueryKey } from './queryKeys';
import type { QueryClient } from '@tanstack/react-query';

const recomputeDraftCounts = (rows: ImportDraftRow[]) => {
  const invalidRowCount = rows.filter((row) => row.status === 'invalid').length;
  return {
    rowCount: rows.length,
    validRowCount: rows.length - invalidRowCount,
    invalidRowCount,
  };
};

const withRecomputedStatus = (row: ImportDraftRow): ImportDraftRow => ({
  ...row,
  status: computeImportRowStatus({
    status: row.status,
    reviewType: row.reviewType,
    parsedType: row.parsedType,
    reviewCategoryName: row.reviewCategoryName,
    reviewAssigneeMemberIds: row.reviewAssigneeMemberIds,
  }),
});

const patchActiveDraftSummary = (
  qc: QueryClient,
  draftId: string,
  counts: ReturnType<typeof recomputeDraftCounts>
) => {
  qc.setQueryData<ImportDraftSummary[]>(activeImportDraftsQueryKey, (current) =>
    current?.map((draft) =>
      draft.id === draftId ? { ...draft, ...counts } : draft
    )
  );
};

const mapDraftRows = (
  rows: ImportDraftRow[],
  rowId: string,
  patch: Partial<ImportDraftRow>
) =>
  rows.map((row) =>
    row.id === rowId ? withRecomputedStatus({ ...row, ...patch }) : row
  );

export const patchImportDraftRow = (
  qc: QueryClient,
  draftId: string,
  rowId: string,
  patch: Partial<ImportDraftRow>
) => {
  qc.setQueryData<ImportDraft | undefined>(
    importDraftQueryKey(draftId),
    (current) => {
      if (!current) return current;
      const rows = mapDraftRows(current.rows, rowId, patch);
      const counts = recomputeDraftCounts(rows);
      patchActiveDraftSummary(qc, draftId, counts);
      return { ...current, ...counts, rows };
    }
  );
};

export const replaceImportDraftRow = (
  qc: QueryClient,
  draftId: string,
  updatedRow: ImportDraftRow
) => {
  qc.setQueryData<ImportDraft | undefined>(
    importDraftQueryKey(draftId),
    (current) => {
      if (!current) return current;
      const rows = current.rows.map((row) =>
        row.id === updatedRow.id
          ? withRecomputedStatus({ ...row, ...updatedRow })
          : row
      );
      const counts = recomputeDraftCounts(rows);
      patchActiveDraftSummary(qc, draftId, counts);
      return { ...current, ...counts, rows };
    }
  );
};

export const restoreImportDraftCache = (
  qc: QueryClient,
  draftId: string,
  previousDraft: ImportDraft | undefined
) => {
  if (!previousDraft) return;
  qc.setQueryData(importDraftQueryKey(draftId), previousDraft);
  patchActiveDraftSummary(qc, draftId, {
    rowCount: previousDraft.rowCount,
    validRowCount: previousDraft.validRowCount,
    invalidRowCount: previousDraft.invalidRowCount,
  });
};

export const patchImportDraftRowsSelection = (
  qc: QueryClient,
  draftId: string,
  rowIds: string[],
  selectedForImport: boolean
) => {
  const rowIdSet = new Set(rowIds);
  qc.setQueryData<ImportDraft | undefined>(
    importDraftQueryKey(draftId),
    (current) => {
      if (!current) return current;
      const rows = current.rows.map((row) =>
        rowIdSet.has(row.id) ? { ...row, selectedForImport } : row
      );
      return { ...current, rows };
    }
  );
};
