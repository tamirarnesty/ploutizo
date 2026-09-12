/**
 * Requirement evaluation lives in `import-set-verification`. This husk keeps
 * `isImportRequirementKey` because web still imports this subpath.
 */
import { IMPORT_REQUIREMENT_KEY_VALUES } from '@ploutizo/types';
import type { ImportRequirementKey } from '@ploutizo/types';

export const isImportRequirementKey = (
  value: string
): value is ImportRequirementKey =>
  (IMPORT_REQUIREMENT_KEY_VALUES as readonly string[]).includes(value);
