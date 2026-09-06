import type { ImportDraft, ImportDraftSummary } from '@ploutizo/types';

/** Draft session header + refund/match facts for local evaluation (no live row edits). */
export type ImportDraftMeta = ImportDraftSummary &
  Pick<ImportDraft, 'refundTargetFacts' | 'matchTargetFacts'>;

export const toImportDraftMeta = (draft: ImportDraft): ImportDraftMeta => {
  const { rows: _rows, ...meta } = draft;
  return meta;
};
