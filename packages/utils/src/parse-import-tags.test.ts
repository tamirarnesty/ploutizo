import { describe, expect, it } from 'vitest';
import { parseImportTags } from './parse-import-tags';

describe('parseImportTags', () => {
  it('splits on semicolons and commas', () => {
    expect(parseImportTags('food; errands, travel')).toEqual([
      'food',
      'errands',
      'travel',
    ]);
  });

  it('trims whitespace and drops empty segments', () => {
    expect(parseImportTags('  a ; ; b,  ')).toEqual(['a', 'b']);
  });

  it('returns empty array for blank input', () => {
    expect(parseImportTags('')).toEqual([]);
    expect(parseImportTags('   ')).toEqual([]);
  });
});
