import { describe, expect, it } from 'vitest';
import { formatAccountLabel } from './format-account-label';

describe('formatAccountLabel', () => {
  it('joins name, institution, and masked last four', () => {
    expect(
      formatAccountLabel({
        name: 'Visa',
        institution: 'TD',
        lastFour: '1234',
      })
    ).toBe('Visa · TD · ••1234');
  });

  it('omits null institution and last four', () => {
    expect(
      formatAccountLabel({
        name: 'Visa',
        institution: null,
        lastFour: null,
      })
    ).toBe('Visa');
  });
});
