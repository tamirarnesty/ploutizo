import {
  cancelScheduledImportDraftWorkingCopyRederive,
  endImportDraftWorkingCopyRederive,
} from './scheduleImportDraftWorkingCopyRederive';
import {
  clearAllImportDraftReviewRuntimes,
  deleteImportDraftReviewRuntime,
} from './importDraftReviewRuntime';
import { endImportDraftPacedMutations } from './getImportDraftPacedMutations';
import { endImportDraftPersistBaselines } from './importDraftPersistBaselines';
import { endImportReviewAutosave } from './importReviewAutosave';
import { endImportReviewEvaluations } from './importReviewEvaluations';

/** Paced persist, autosave, baselines, and debounced rederive for one draft. */
export const releaseImportDraftReviewRuntime = (draftId: string) => {
  cancelScheduledImportDraftWorkingCopyRederive(draftId);
  deleteImportDraftReviewRuntime(draftId);
};

/** Household / working-set switch: clear all draft review runtime state. */
export const endImportDraftReviewRuntime = () => {
  endImportDraftPacedMutations();
  endImportDraftPersistBaselines();
  endImportDraftWorkingCopyRederive();
  endImportReviewAutosave();
  endImportReviewEvaluations();
  clearAllImportDraftReviewRuntimes();
};
