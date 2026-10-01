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
      {
        id: 'member-1',
        firstName: 'Tamir',
        lastName: 'Arnesty',
        email: 'tamir@example.com',
        imageUrl: null,
      },
      {
        id: 'member-2',
        firstName: 'Alex',
        lastName: 'Smith',
        email: 'alex@example.com',
        imageUrl: null,
      },
      {
        id: 'member-3',
        firstName: 'Emily',
        lastName: 'Example',
        email: 'emily@example.com',
        imageUrl: null,
      },
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
    expect(
      resolve({
        csvCategoryName: 'Travel',
        csvAssigneeName: null,
        csvTagNames: [],
      }).reviewCategoryId
    ).toBeNull();
  });

  it('resolves multiple semicolon-separated assignee hints', () => {
    expect(
      resolve({
        csvCategoryName: null,
        csvAssigneeName: 'tamir ; emily',
        csvTagNames: [],
      }).reviewAssigneeMemberIds
    ).toEqual(['member-1', 'member-3']);
  });

  it('skips unknown or ambiguous segments without discarding matched ones', () => {
    expect(
      resolve({
        csvCategoryName: null,
        csvAssigneeName: 'tamir; unknown; emily',
        csvTagNames: [],
      }).reviewAssigneeMemberIds
    ).toEqual(['member-1', 'member-3']);
  });

  it('skips an ambiguous segment while keeping uniquely matched segments', () => {
    const resolveAmbiguous = createImportReferenceResolver({
      categories: [],
      tags: [],
      members: [
        {
          id: 'member-1',
          firstName: 'Tamir',
          lastName: 'Arnesty',
          email: 'tamir@example.com',
          imageUrl: null,
        },
        {
          id: 'member-3',
          firstName: 'Tamir',
          lastName: 'Smith',
          email: 'tamir.smith@example.com',
          imageUrl: null,
        },
        {
          id: 'member-4',
          firstName: 'Emily',
          lastName: 'Example',
          email: 'emily@example.com',
          imageUrl: null,
        },
      ],
    });

    expect(
      resolveAmbiguous({
        csvCategoryName: null,
        csvAssigneeName: 'Tamir; emily',
        csvTagNames: [],
      }).reviewAssigneeMemberIds
    ).toEqual(['member-4']);
  });

  it('returns empty assignees when every segment is unknown', () => {
    expect(
      resolve({
        csvCategoryName: null,
        csvAssigneeName: 'nobody; also-nobody',
        csvTagNames: [],
      }).reviewAssigneeMemberIds
    ).toEqual([]);
  });

  it('dedupes repeated segments to one member id', () => {
    expect(
      resolve({
        csvCategoryName: null,
        csvAssigneeName: 'Tamir; tamir arnesty',
        csvTagNames: [],
      }).reviewAssigneeMemberIds
    ).toEqual(['member-1']);
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

  it('leaves assignees empty when a first name matches more than one member', () => {
    const resolveAmbiguous = createImportReferenceResolver({
      categories: [],
      tags: [],
      members: [
        {
          id: 'member-1',
          firstName: 'Tamir',
          lastName: 'Arnesty',
          email: 'tamir@example.com',
          imageUrl: null,
        },
        {
          id: 'member-3',
          firstName: 'Tamir',
          lastName: 'Smith',
          email: 'tamir.smith@example.com',
          imageUrl: null,
        },
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

  it('resolves assignee by full name when first names collide', () => {
    const resolveAmbiguous = createImportReferenceResolver({
      categories: [],
      tags: [],
      members: [
        {
          id: 'member-1',
          firstName: 'Tamir',
          lastName: 'Arnesty',
          email: 'tamir@example.com',
          imageUrl: null,
        },
        {
          id: 'member-3',
          firstName: 'Tamir',
          lastName: 'Smith',
          email: 'tamir.smith@example.com',
          imageUrl: null,
        },
      ],
    });

    expect(
      resolveAmbiguous({
        csvCategoryName: null,
        csvAssigneeName: 'Tamir Smith',
        csvTagNames: [],
      }).reviewAssigneeMemberIds
    ).toEqual(['member-3']);
  });
});
