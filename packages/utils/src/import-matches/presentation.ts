import type { ImportMatchIssue } from './types';

export const IMPORT_MATCH_ISSUE_COPY: Partial<
  Record<ImportMatchIssue, string>
> = {
  collision:
    'Another row in this import uses the same external ID. Select one row and leave the other unselected.',
  invalidated_decision:
    'The saved match is no longer valid. Clear it or restore the original values to continue.',
  ambiguous_exact:
    'Multiple exact matches exist on this card. Review before continuing.',
  advisory_unresolved:
    'A similar transaction was found. Accept or dismiss the suggestion to continue.',
  missing_target: 'The saved match no longer exists. Clear it to continue.',
  deleted_target: 'The saved match was deleted. Clear it to continue.',
  wrong_account:
    'The saved match is on a different card. Clear it to continue.',
  duplicate_target:
    'Another selected row already matches this transaction. Keep one match and import or skip the other.',
};
