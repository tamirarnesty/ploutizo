import type { ImportDraft, ImportDraftSummary } from '@ploutizo/types';

/** Slim draft header context — no live row edits live here. */
export type ImportDraftMeta = ImportDraftSummary;

export const toImportDraftMeta = (draft: ImportDraft): ImportDraftMeta => {
  const { rows: _rows, ...meta } = draft;
  return meta;
};
