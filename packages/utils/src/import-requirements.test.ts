import { describe, expect, it } from 'vitest';
import { isImportRequirementKey } from './import-requirements';

describe('isImportRequirementKey', () => {
  it('accepts known requirement keys', () => {
    expect(isImportRequirementKey('transaction.category.required')).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(isImportRequirementKey('import.legacy.prose_failure')).toBe(false);
  });
});
