import { describe, expect, it } from 'vitest';
import {
  matchCategoryIdByName,
  matchOrgMemberIdsByName,
  matchTagIdsByNames,
} from './match-import-references';

describe('matchCategoryIdByName', () => {
  const categories = [
    { id: 'cat-1', name: 'Dining' },
    { id: 'cat-2', name: 'Groceries' },
  ];

  it('returns id for exact case-insensitive match', () => {
    expect(matchCategoryIdByName('dining', categories)).toBe('cat-1');
    expect(matchCategoryIdByName('  Groceries ', categories)).toBe('cat-2');
  });

  it('returns null for unknown or empty names', () => {
    expect(matchCategoryIdByName('Travel', categories)).toBeNull();
    expect(matchCategoryIdByName(null, categories)).toBeNull();
    expect(matchCategoryIdByName('   ', categories)).toBeNull();
  });
});

describe('matchTagIdsByNames', () => {
  const tags = [
    { id: 'tag-1', name: 'food' },
    { id: 'tag-2', name: 'errands' },
  ];

  it('maps known names to ids and drops unknown names', () => {
    expect(matchTagIdsByNames(['food', 'missing', 'ERRANDS'], tags)).toEqual([
      'tag-1',
      'tag-2',
    ]);
  });

  it('dedupes matched ids', () => {
    expect(matchTagIdsByNames(['food', 'Food'], tags)).toEqual(['tag-1']);
  });
});

describe('matchOrgMemberIdsByName', () => {
  const members = [
    { id: 'member-1', displayName: 'Tamir Arnesty' },
    { id: 'member-2', displayName: 'Alex Smith' },
  ];

  it('returns member id for exact displayName match', () => {
    expect(matchOrgMemberIdsByName('tamir arnesty', members)).toEqual([
      'member-1',
    ]);
  });

  it('does not partial-match display names', () => {
    expect(matchOrgMemberIdsByName('Tamir', members)).toEqual([]);
  });

  it('returns empty array for missing names', () => {
    expect(matchOrgMemberIdsByName(null, members)).toEqual([]);
  });
});
