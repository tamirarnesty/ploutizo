import { describe, expect, it } from 'vitest';
import { memberFullLabel, memberShortLabel } from './member-label';

const tamir = {
  firstName: 'Tamir',
  lastName: 'Arnesty',
  email: 'tamir@example.com',
};

const alex = {
  firstName: 'Alex',
  lastName: 'Smith',
  email: 'alex@example.com',
};

describe('memberFullLabel', () => {
  it('joins first and last name', () => {
    expect(memberFullLabel(tamir)).toBe('Tamir Arnesty');
  });

  it('uses email when first and last are missing', () => {
    expect(
      memberFullLabel({
        firstName: null,
        lastName: '  ',
        email: 'ada@example.com',
      })
    ).toBe('ada@example.com');
  });

  it('keeps a single given name', () => {
    expect(
      memberFullLabel({
        firstName: 'Ada',
        lastName: null,
        email: 'ada@example.com',
      })
    ).toBe('Ada');
  });
});

describe('memberShortLabel', () => {
  it('uses first name when it is unique in the household', () => {
    expect(memberShortLabel(tamir, [tamir, alex])).toBe('Tamir');
  });

  it('uses the full label when two members share a first name', () => {
    const tamirSmith = {
      firstName: 'Tamir',
      lastName: 'Smith',
      email: 'tamir.smith@example.com',
    };
    expect(memberShortLabel(tamir, [tamir, tamirSmith])).toBe('Tamir Arnesty');
  });

  it('uses the full label when first name is missing', () => {
    const unnamed = {
      firstName: null,
      lastName: null,
      email: 'guest@example.com',
    };
    expect(memberShortLabel(unnamed, [unnamed, alex])).toBe(
      'guest@example.com'
    );
  });
});
