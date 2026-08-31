import { describe, expect, it } from 'vitest';
import {
  formatAccountInstitutionMeta,
  formatAccountLabel,
} from './format-account-label';

describe('formatAccountLabel', () => {
  it('joins name, institution, and masked last four', () => {
    expect(
      formatAccountLabel({
        name: 'Visa',
        institutionId: 'td',
        lastFour: '1234',
      })
    ).toBe('Visa · TD · ••1234');
  });

  it('omits null institution and last four', () => {
    expect(
      formatAccountLabel({
        name: 'Visa',
        institutionId: null,
        lastFour: null,
      })
    ).toBe('Visa');
  });

  it('uses a fallback for blank names', () => {
    expect(
      formatAccountLabel({
        name: '  ',
        institutionId: 'td',
        lastFour: '1234',
      })
    ).toBe('Unnamed Account · TD · ••1234');
  });
});

describe('formatAccountInstitutionMeta', () => {
  it('joins institution name and masked last four', () => {
    expect(
      formatAccountInstitutionMeta({ institutionId: 'td', lastFour: '1234' })
    ).toBe('TD •••• 1234');
  });

  it('returns null when both parts are absent', () => {
    expect(
      formatAccountInstitutionMeta({ institutionId: null, lastFour: null })
    ).toBeNull();
  });
});
