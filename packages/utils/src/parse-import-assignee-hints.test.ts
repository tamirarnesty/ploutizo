import { describe, expect, it } from 'vitest';
import { parseImportAssigneeHints } from './parse-import-assignee-hints';

describe('parseImportAssigneeHints', () => {
  it('splits on semicolons only', () => {
    expect(parseImportAssigneeHints('Tamir, Alex')).toEqual(['Tamir, Alex']);
    expect(parseImportAssigneeHints('tamir; emily')).toEqual([
      'tamir',
      'emily',
    ]);
  });

  it('trims whitespace and drops empty segments', () => {
    expect(parseImportAssigneeHints('  a ; ; b  ')).toEqual(['a', 'b']);
  });

  it('returns empty array for blank input', () => {
    expect(parseImportAssigneeHints('')).toEqual([]);
    expect(parseImportAssigneeHints('   ')).toEqual([]);
  });
});
