import {
  computeImportDraftRowCounts,
  withDerivedImportRowStatus,
} from '@ploutizo/utils/import-row-status';
import type {
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
} from '@ploutizo/types';
import { activeImportDraftsQueryKey, importDraftQueryKey } from './queryKeys';
import type { QueryClient } from '@tanstack/react-query';

const patchActiveDraftSummary = (
  qc: QueryClient,
  draftId: string,
  counts: ReturnType<typeof computeImportDraftRowCounts>
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
    row.id === rowId ? withDerivedImportRowStatus({ ...row, ...patch }) : row
  );

const writeDraftWithCounts = (
  qc: QueryClient,
  draftId: string,
  nextDraft: ImportDraft
) => {
  const counts = computeImportDraftRowCounts(nextDraft.rows);
  const draft = { ...nextDraft, ...counts };
  qc.setQueryData<ImportDraft | undefined>(importDraftQueryKey(draftId), draft);
  patchActiveDraftSummary(qc, draftId, counts);
  return draft;
};

const applyRowMap = (
  qc: QueryClient,
  draftId: string,
  mapRows: (rows: ImportDraftRow[]) => ImportDraftRow[]
) => {
  const current = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
  if (!current) return;
  writeDraftWithCounts(qc, draftId, {
    ...current,
    rows: mapRows(current.rows),
  });
};

export const patchImportDraftRow = (
  qc: QueryClient,
  draftId: string,
  rowId: string,
  patch: Partial<ImportDraftRow>
) => {
  applyRowMap(qc, draftId, (rows) => mapDraftRows(rows, rowId, patch));
};

export const replaceImportDraftRow = (
  qc: QueryClient,
  draftId: string,
  updatedRow: ImportDraftRow
) => {
  applyRowMap(qc, draftId, (rows) =>
    rows.map((row) =>
      row.id === updatedRow.id
        ? withDerivedImportRowStatus({ ...row, ...updatedRow })
        : row
    )
  );
};

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  return (
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
};

/** Revert only keys still holding this mutation's optimistic value. */
export const revertImportDraftRowPatch = (
  qc: QueryClient,
  draftId: string,
  rowId: string,
  previousRow: ImportDraftRow | undefined,
  body: Partial<ImportDraftRow>
) => {
  if (!previousRow) return;

  const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
  const currentRow = draft?.rows.find((row) => row.id === rowId);
  if (!currentRow) return;

  const patch = Object.fromEntries(
    (Object.keys(body) as (keyof ImportDraftRow)[]).flatMap((key) => {
      if (!valuesEqual(currentRow[key], body[key])) return [];
      return [[key, previousRow[key]] as const];
    })
  ) as Partial<ImportDraftRow>;

  if (Object.keys(patch).length === 0) return;
  patchImportDraftRow(qc, draftId, rowId, patch);
};

/** Revert selection only where the optimistic value is still present. */
export const revertImportDraftRowsSelection = (
  qc: QueryClient,
  draftId: string,
  previousSelections: Map<string, boolean>,
  optimisticSelectedForImport: boolean
) => {
  qc.setQueryData<ImportDraft | undefined>(
    importDraftQueryKey(draftId),
    (current) => {
      if (!current) return current;
      const rows = current.rows.map((row) => {
        const previous = previousSelections.get(row.id);
        if (
          previous === undefined ||
          row.selectedForImport !== optimisticSelectedForImport
        ) {
          return row;
        }
        return { ...row, selectedForImport: previous };
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
  const current = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
  if (!current) return;
  const currentRow = current.rows.find((row) => row.id === updatedRow.id);
  if (!currentRow || updatedRow.updatedAt < currentRow.updatedAt) {
    return;
  }
  writeDraftWithCounts(qc, draftId, {
    ...current,
    rows: current.rows.map((row) =>
      row.id === updatedRow.id
        ? withDerivedImportRowStatus({ ...row, ...updatedRow })
        : row
    ),
  });
};

export const applyServerRowsIfNewer = (
  qc: QueryClient,
  draftId: string,
  updatedRows: ImportDraftRow[]
) => {
  const current = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
  if (!current) return;
  const updatedById = new Map(updatedRows.map((row) => [row.id, row]));
  writeDraftWithCounts(qc, draftId, {
    ...current,
    rows: current.rows.map((row) => {
      const updated = updatedById.get(row.id);
      if (!updated || updated.updatedAt < row.updatedAt) return row;
      return withDerivedImportRowStatus({ ...row, ...updated });
    }),
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
