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
      const rows = current.rows.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row
      );
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
        row.id === updatedRow.id ? updatedRow : row
      );
      const counts = recomputeDraftCounts(rows);
      patchActiveDraftSummary(qc, draftId, counts);
      return { ...current, ...counts, rows };
    }
  );
};
