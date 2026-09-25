import {
  endImportDraftPacedMutations,
  releaseImportDraftPacedMutations,
} from './getImportDraftPacedMutations';
import {
  endImportDraftPersistBaselines,
  releaseImportDraftPersistBaselines,
} from './importDraftPersistBaselines';
import {
  endImportReviewAutosave,
  releaseImportReviewAutosave,
} from './importReviewAutosave';
import {
  endImportReviewEvaluations,
  releaseImportReviewEvaluations,
} from './importReviewEvaluations';
import {
  endImportDraftWorkingCopyRederive,
  releaseImportDraftWorkingCopyRederive,
} from './scheduleImportDraftWorkingCopyRederive';

/** Paced persist, autosave, baselines, and debounced rederive for one draft. */
export const releaseImportDraftReviewRuntime = (draftId: string) => {
  releaseImportDraftPacedMutations(draftId);
  releaseImportDraftPersistBaselines(draftId);
  releaseImportDraftWorkingCopyRederive(draftId);
  releaseImportReviewAutosave(draftId);
  releaseImportReviewEvaluations(draftId);
};

/** Household / working-set switch: clear all draft review runtime state. */
export const endImportDraftReviewRuntime = () => {
  endImportDraftPacedMutations();
  endImportDraftPersistBaselines();
  endImportDraftWorkingCopyRederive();
  endImportReviewAutosave();
  endImportReviewEvaluations();
};
