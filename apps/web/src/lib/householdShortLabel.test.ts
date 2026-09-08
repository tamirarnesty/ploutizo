import { describe, expect, it } from 'vitest';
import type { OrgMember } from '@ploutizo/types';
import { householdShortLabel } from './householdShortLabel';

const member = (
  id: string,
  firstName: string,
  lastName: string
): OrgMember => ({
  id,
  orgId: 'org_1',
  role: 'admin',
  joinedAt: '2026-01-01T00:00:00.000Z',
  externalId: `user_${id}`,
  email: `${id}@example.com`,
  imageUrl: null,
  firstName,
  lastName,
});

describe('householdShortLabel', () => {
  it('uses the first name when it is unique in the household', () => {
    const alex = member('1', 'Alex', 'Smith');
    const tamir = member('2', 'Tamir', 'Arnesty');
    expect(householdShortLabel(alex.id, [alex, tamir], alex.email)).toBe(
      'Alex'
    );
  });

  it('uses the full label when two household members share a first name', () => {
    const alexSmith = member('1', 'Alex', 'Smith');
    const alexJones = member('2', 'Alex', 'Jones');
    expect(
      householdShortLabel(alexSmith.id, [alexSmith, alexJones], 'fallback')
    ).toBe('Alex Smith');
  });

  it('uses the compact fallback when the member is not in the household', () => {
    const alex = member('1', 'Alex', 'Smith');
    expect(householdShortLabel('missing', [alex], 'Alex Smith')).toBe(
      'Alex Smith'
    );
  });
});
