import { describe, expect, it } from 'vitest';
import type { OrgMember } from '@ploutizo/types';
import {
  getFirstNameFromDisplayName,
  getOrgMemberFirstName,
} from './memberDisplayName';

describe('memberDisplayName', () => {
  describe('getFirstNameFromDisplayName', () => {
    it('returns first token or em dash when empty', () => {
      expect(getFirstNameFromDisplayName('Tamir Arnesty')).toBe('Tamir');
      expect(getFirstNameFromDisplayName('Emily')).toBe('Emily');
      expect(getFirstNameFromDisplayName('  ')).toBe('—');
    });
  });

  describe('getOrgMemberFirstName', () => {
    it('prefers firstName over displayName', () => {
      const member = {
        id: '1',
        firstName: 'Tam',
        displayName: 'Tamir Arnesty',
        imageUrl: null,
      } as OrgMember;
      expect(getOrgMemberFirstName(member)).toBe('Tam');
    });
  });
});
