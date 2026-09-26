import type { ImportRequirementFailure } from '@ploutizo/types';

/** One-shot Review route signals; see ADR 0005 “Ephemeral handoff channels”. */
export interface ImportReviewLocationState {
  prepareAgain?: boolean;
  issues?: ImportRequirementFailure[];
}

export const IMPORT_REVIEW_PREPARE_AGAIN_MESSAGE =
  'Prepare this import again before finalizing.';

export const IMPORT_REVIEW_CONTINUE_SUPERSEDED_MESSAGE =
  'Review changed before continue finished. Try again.';
