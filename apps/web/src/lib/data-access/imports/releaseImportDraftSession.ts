import { releaseImportDraftPacedMutations } from './getImportDraftPacedMutations';
import { releaseImportDraftPersistBaselines } from './importDraftPersistBaselines';
import { releaseImportDraftWorkingCopyRederive } from './scheduleImportDraftWorkingCopyRederive';
import { releaseImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { clearImportFinalizePreviewSession } from './importFinalizePreviewSession';
import { releaseImportReviewAutosave } from './importReviewAutosave';

/**
 * End a draft's client working copy when the business scope is done.
 * When a rows collection exists, cleanup owns the draft query key. When it
 * does not (hub discard before review), release still clears cached draft data.
 */
export const releaseImportDraftSession = async (draftId: string) => {
  releaseImportDraftPacedMutations(draftId);
  releaseImportDraftPersistBaselines(draftId);
  releaseImportDraftWorkingCopyRederive(draftId);
  releaseImportReviewAutosave(draftId);
  clearImportFinalizePreviewSession(draftId);
  await releaseImportDraftRowsCollection(draftId);
};
