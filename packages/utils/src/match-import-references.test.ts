import { describe, expect, it } from 'vitest';
import { createImportReferenceResolver } from './match-import-references';

describe('createImportReferenceResolver', () => {
  const resolve = createImportReferenceResolver({
    categories: [
      { id: 'cat-1', name: 'Dining' },
      { id: 'cat-2', name: 'Groceries' },
    ],
    tags: [
      { id: 'tag-1', name: 'food' },
      { id: 'tag-2', name: 'errands' },
    ],
    members: [
      { id: 'member-1', displayName: 'Tamir Arnesty' },
      { id: 'member-2', displayName: 'Alex Smith' },
    ],
  });

  it('resolves category, tags, and assignee together', () => {
    expect(
      resolve({
        csvCategoryName: ' dining ',
        csvAssigneeName: 'tamir arnesty',
        csvTagNames: ['food', 'missing', 'ERRANDS', 'Food'],
      })
    ).toEqual({
      reviewCategoryId: 'cat-1',
      reviewTagIds: ['tag-1', 'tag-2'],
      reviewAssigneeMemberIds: ['member-1'],
    });
  });

  it('returns empty refs when hints are missing or unknown', () => {
    expect(
      resolve({
        csvCategoryName: null,
        csvAssigneeName: 'Tamir',
        csvTagNames: [],
      })
    ).toEqual({
      reviewCategoryId: null,
      reviewTagIds: [],
      reviewAssigneeMemberIds: [],
    });
  });

  it('returns null category for unknown names', () => {
    expect(
      resolve({
        csvCategoryName: 'Travel',
        csvAssigneeName: null,
        csvTagNames: [],
      }).reviewCategoryId
    ).toBeNull();
  });

  it('does not partial-match display names', () => {
    expect(
      resolve({
        csvCategoryName: null,
        csvAssigneeName: 'Tamir',
        csvTagNames: [],
      }).reviewAssigneeMemberIds
    ).toEqual([]);
  });
});
