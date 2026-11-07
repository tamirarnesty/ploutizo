import {
  cancelScheduledImportDraftWorkingCopyRederive,
  endImportDraftWorkingCopyRederive,
} from './scheduleImportDraftWorkingCopyRederive';
import {
  clearAllImportDraftReviewRuntimes,
  deleteImportDraftReviewRuntime,
} from './importDraftReviewRuntime';
import {
  getReviewPersistence,
  releaseAllReviewPersistence,
} from './reviewPersistence';
import { endImportReviewEvaluations } from './importReviewEvaluations';

/** Review persistence, evaluations, and debounced rederive for one draft. */
export const releaseImportDraftReviewRuntime = (draftId: string) => {
  cancelScheduledImportDraftWorkingCopyRederive(draftId);
  getReviewPersistence(draftId).release();
  deleteImportDraftReviewRuntime(draftId);
};

/** Household / working-set switch: clear all draft review runtime state. */
export const endImportDraftReviewRuntime = () => {
  releaseAllReviewPersistence();
  endImportDraftWorkingCopyRederive();
  endImportReviewEvaluations();
  clearAllImportDraftReviewRuntimes();
};
