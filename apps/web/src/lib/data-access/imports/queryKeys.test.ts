import { describe, expect, it } from 'vitest';
import {
  importDraftQueryKey,
  importFinalizePreviewSessionQueryKey,
} from './queryKeys';

describe('import draft query keys', () => {
  it('names a draft by id', () => {
    expect(importDraftQueryKey('draft_1')).toEqual([
      'imports',
      'draft',
      'draft_1',
    ]);
    expect(importDraftQueryKey(null)).toEqual(['imports', 'draft', null]);
  });

  it('names a finalize preview session handoff', () => {
    expect(importFinalizePreviewSessionQueryKey('draft_1')).toEqual([
      'imports',
      'draft',
      'draft_1',
      'finalize-preview-session',
    ]);
  });
});
