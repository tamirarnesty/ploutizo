import type { ImportRequirementFailure } from '@ploutizo/types';

export interface ImportReviewLocationState {
  prepareAgain?: boolean;
  issues?: ImportRequirementFailure[];
}

export const IMPORT_REVIEW_PREPARE_AGAIN_MESSAGE =
  'Prepare this import again before finalizing.';
