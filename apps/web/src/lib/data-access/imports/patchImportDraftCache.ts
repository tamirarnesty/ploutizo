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

export const revertImportDraftRowPatch = (
  qc: QueryClient,
  draftId: string,
  rowId: string,
  previousRow: ImportDraftRow | undefined,
  body: Partial<ImportDraftRow>
) => {
  if (!previousRow) return;
  const patch = Object.fromEntries(
    (Object.keys(body) as (keyof ImportDraftRow)[]).map((key) => [
      key,
      previousRow[key],
    ])
  ) as Partial<ImportDraftRow>;
  patchImportDraftRow(qc, draftId, rowId, patch);
};

export const revertImportDraftRowsSelection = (
  qc: QueryClient,
  draftId: string,
  previousSelections: Map<string, boolean>
) => {
  qc.setQueryData<ImportDraft | undefined>(
    importDraftQueryKey(draftId),
    (current) => {
      if (!current) return current;
      const rows = current.rows.map((row) => {
        const previous = previousSelections.get(row.id);
        return previous === undefined
          ? row
          : { ...row, selectedForImport: previous };
      });
      return { ...current, rows };
    }
  );
};

export const applyServerRowIfNewer = (
  qc: QueryClient,
  draftId: string,
  updatedRow: ImportDraftRow
) => {
  qc.setQueryData<ImportDraft | undefined>(
    importDraftQueryKey(draftId),
    (current) => {
      if (!current) return current;
      const currentRow = current.rows.find((row) => row.id === updatedRow.id);
      if (!currentRow || updatedRow.updatedAt < currentRow.updatedAt) {
        return current;
      }
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

export const applyServerRowsIfNewer = (
  qc: QueryClient,
  draftId: string,
  updatedRows: ImportDraftRow[]
) => {
  const updatedById = new Map(updatedRows.map((row) => [row.id, row]));
  qc.setQueryData<ImportDraft | undefined>(
    importDraftQueryKey(draftId),
    (current) => {
      if (!current) return current;
      const rows = current.rows.map((row) => {
        const updated = updatedById.get(row.id);
        if (!updated || updated.updatedAt < row.updatedAt) return row;
        return { ...row, ...updated };
      });
      return { ...current, rows };
    }
  );
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
