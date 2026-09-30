import { getApiErrorCode } from '@/lib/queryClient';
import { isImportStaleFinalizeError } from './importRequirementIssues';

export type ImportFinalizeErrorOutcome =
  | 'return-to-review'
  | 'not-found'
  | 'unknown';

const IMPORT_FINALIZE_ERROR_OUTCOME: readonly {
  match: (error: unknown) => boolean;
  outcome: ImportFinalizeErrorOutcome;
}[] = [
  { match: isImportStaleFinalizeError, outcome: 'return-to-review' },
  {
    match: (error) => getApiErrorCode(error) === 'NOT_FOUND',
    outcome: 'not-found',
  },
];

export const classifyImportFinalizeError = (
  error: unknown
): ImportFinalizeErrorOutcome => {
  for (const { match, outcome } of IMPORT_FINALIZE_ERROR_OUTCOME) {
    if (match(error)) return outcome;
  }
  return 'unknown';
};
