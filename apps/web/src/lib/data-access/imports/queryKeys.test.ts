import { describe, expect, it } from 'vitest';
import { importDraftQueryKey } from './queryKeys';

describe('import draft query keys', () => {
  it('names a draft by id', () => {
    expect(importDraftQueryKey('draft_1')).toEqual([
      'imports',
      'draft',
      'draft_1',
    ]);
    expect(importDraftQueryKey(null)).toEqual(['imports', 'draft', null]);
  });
});
