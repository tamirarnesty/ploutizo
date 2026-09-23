import { releaseImportDraftPacedMutations } from './getImportDraftPacedMutations';
import { releaseImportDraftPersistBaselines } from './importDraftPersistBaselines';
import { releaseImportReviewAutosave } from './importReviewAutosave';
import { releaseImportDraftWorkingCopyRederive } from './scheduleImportDraftWorkingCopyRederive';

/** Paced persist, autosave, baselines, and debounced rederive for one draft. */
export const releaseImportDraftReviewRuntime = (draftId: string) => {
  releaseImportDraftPacedMutations(draftId);
  releaseImportDraftPersistBaselines(draftId);
  releaseImportDraftWorkingCopyRederive(draftId);
  releaseImportReviewAutosave(draftId);
};
