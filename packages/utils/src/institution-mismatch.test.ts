import { describe, expect, it } from 'vitest';
import {
  formatInstitutionMismatchWarning,
  getInstitutionMismatchWarning,
} from './institution-mismatch';

describe('getInstitutionMismatchWarning', () => {
  it('returns a warning only when both institutions are known and differ', () => {
    expect(
      getInstitutionMismatchWarning({
        detectedInstitutionId: 'amex',
        accountInstitutionId: 'td',
      })
    ).toEqual({
      detectedInstitutionId: 'amex',
      accountInstitutionId: 'td',
    });
  });

  it('returns null when either institution is unknown', () => {
    expect(
      getInstitutionMismatchWarning({
        detectedInstitutionId: 'amex',
        accountInstitutionId: null,
      })
    ).toBeNull();
    expect(
      getInstitutionMismatchWarning({
        detectedInstitutionId: 'internal',
        accountInstitutionId: 'td',
      })
    ).toBeNull();
    expect(
      getInstitutionMismatchWarning({
        detectedInstitutionId: null,
        accountInstitutionId: 'td',
      })
    ).toBeNull();
  });

  it('returns null when both known institutions match', () => {
    expect(
      getInstitutionMismatchWarning({
        detectedInstitutionId: 'td',
        accountInstitutionId: 'td',
      })
    ).toBeNull();
  });
});

describe('formatInstitutionMismatchWarning', () => {
  it('names both catalog institutions without blocking language', () => {
    expect(
      formatInstitutionMismatchWarning({
        detectedInstitutionId: 'amex',
        accountInstitutionId: 'td',
      })
    ).toBe(
      'This file looks like Amex, but the selected card is TD. You can continue if that is intentional.'
    );
  });
});
