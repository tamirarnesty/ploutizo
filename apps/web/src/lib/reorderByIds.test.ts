import { describe, expect, it } from 'vitest';
import { reorderByIds } from './reorderByIds';

describe('reorderByIds', () => {
  const items = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ];

  it('reorders items to match orderedIds', () => {
    expect(reorderByIds(items, ['c', 'a', 'b'])).toEqual([
      { id: 'c', name: 'C' },
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
  });

  it('appends items missing from orderedIds', () => {
    expect(reorderByIds(items, ['b'])).toEqual([
      { id: 'b', name: 'B' },
      { id: 'a', name: 'A' },
      { id: 'c', name: 'C' },
    ]);
  });

  it('omits unknown ids in orderedIds', () => {
    expect(reorderByIds(items, ['x', 'a'])).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ]);
  });

  it('returns empty array when items is empty', () => {
    expect(reorderByIds([], ['a'])).toEqual([]);
  });

  it('dedupes duplicate ids in orderedIds', () => {
    expect(reorderByIds(items, ['a', 'a', 'b'])).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ]);
  });
});
