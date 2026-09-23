import type { ImportFinalizePreview } from '@ploutizo/types';

export interface ImportFinalizePreviewSession {
  rowIds: string[];
  preview: ImportFinalizePreview;
}

const sessions = new Map<string, ImportFinalizePreviewSession>();

export const setImportFinalizePreviewSession = (
  draftId: string,
  session: ImportFinalizePreviewSession
) => {
  sessions.set(draftId, session);
};

export const getImportFinalizePreviewSession = (
  draftId: string
): ImportFinalizePreviewSession | undefined => sessions.get(draftId);

export const clearImportFinalizePreviewSession = (draftId: string) => {
  sessions.delete(draftId);
};

export const releaseImportFinalizePreviewSession = (draftId: string) => {
  clearImportFinalizePreviewSession(draftId);
};
