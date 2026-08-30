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
      { id: 'member-1', displayName: 'Tamir Arnesty', firstName: 'Tamir' },
      { id: 'member-2', displayName: 'Alex Smith', firstName: 'Alex' },
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
        csvAssigneeName: 'Jordan',
        csvTagNames: [],
      })
    ).toEqual({
      reviewCategoryId: null,
      reviewTagIds: [],
      reviewAssigneeMemberIds: [],
    });
  });

  it('resolves a unique first name', () => {
    expect(
      resolve({
        csvCategoryName: null,
        csvAssigneeName: 'Tamir',
        csvTagNames: [],
      }).reviewAssigneeMemberIds
    ).toEqual(['member-1']);
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

  it('leaves assignees empty when a first name matches more than one member', () => {
    const resolveAmbiguous = createImportReferenceResolver({
      categories: [],
      tags: [],
      members: [
        { id: 'member-1', displayName: 'Tamir Arnesty', firstName: 'Tamir' },
        { id: 'member-3', displayName: 'Tamir Smith', firstName: 'Tamir' },
      ],
    });

    expect(
      resolveAmbiguous({
        csvCategoryName: null,
        csvAssigneeName: 'Tamir',
        csvTagNames: [],
      }).reviewAssigneeMemberIds
    ).toEqual([]);
  });
});
