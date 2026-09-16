import { describe, expect, it } from 'vitest';
import { importDraftQueryKey, importPreparedQueryKey } from './queryKeys';

describe('import draft and prepared query keys', () => {
  it('names a draft by topic and id', () => {
    expect(importDraftQueryKey('draft_1')).toEqual([
      'imports',
      'draft',
      'draft_1',
    ]);
  });

  it('names a prepared import separately from the live draft', () => {
    expect(importPreparedQueryKey('draft_1')).toEqual([
      'imports',
      'prepared',
      'draft_1',
    ]);
    expect(importPreparedQueryKey('draft_1')).not.toEqual(
      importDraftQueryKey('draft_1')
    );
  });
});
