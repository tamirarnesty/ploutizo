import { describe, expect, it } from 'vitest';
import { makeImportDraftRow } from '@/components/imports/test-fixtures/importDraft';
import { importReviewRowsEqual } from './importReviewRowsEqual';

describe('importReviewRowsEqual', () => {
  it('returns true for identical rows', () => {
    const row = {
      ...makeImportDraftRow({ id: 'row_a' }),
      selectedForImport: true,
    };
    expect(importReviewRowsEqual(row, { ...row })).toBe(true);
  });

  it('returns false when updatedAt differs', () => {
    const left = {
      ...makeImportDraftRow({ id: 'row_a' }),
      selectedForImport: false,
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const right = { ...left, updatedAt: '2026-01-02T00:00:00Z' };
    expect(importReviewRowsEqual(left, right)).toBe(false);
  });
});
