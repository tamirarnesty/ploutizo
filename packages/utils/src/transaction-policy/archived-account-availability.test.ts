import { describe, expect, it } from 'vitest';
import {
  getLastAvailableCalendarDate,
  isAccountAvailableOnCalendarDate,
  toCalendarDate,
  validateArchivedAccountAvailability,
} from './archived-account-availability';

describe('toCalendarDate', () => {
  it('reads yyyy-MM-dd from date-only and ISO datetime strings', () => {
    expect(toCalendarDate('2026-01-15')).toBe('2026-01-15');
    expect(toCalendarDate('2026-01-15T23:30:00.000Z')).toBe('2026-01-15');
  });

  it('uses the UTC calendar date of a Date instant', () => {
    expect(toCalendarDate(new Date('2026-01-15T23:30:00.000Z'))).toBe(
      '2026-01-15'
    );
  });

  it('returns null for unparseable values', () => {
    expect(toCalendarDate('not-a-date')).toBeNull();
    expect(toCalendarDate(new Date(Number.NaN))).toBeNull();
  });
});

describe('isAccountAvailableOnCalendarDate', () => {
  it('allows any date for active accounts', () => {
    expect(isAccountAvailableOnCalendarDate(null, '2026-06-01')).toBe(true);
    expect(isAccountAvailableOnCalendarDate(undefined, '2026-06-01')).toBe(
      true
    );
    expect(isAccountAvailableOnCalendarDate('', '2026-06-01')).toBe(true);
  });

  it('allows activity on the archive calendar date and rejects later dates', () => {
    expect(
      isAccountAvailableOnCalendarDate('2026-01-15T18:00:00.000Z', '2026-01-15')
    ).toBe(true);
    expect(
      isAccountAvailableOnCalendarDate('2026-01-15T18:00:00.000Z', '2026-01-14')
    ).toBe(true);
    expect(
      isAccountAvailableOnCalendarDate('2026-01-15T18:00:00.000Z', '2026-01-16')
    ).toBe(false);
  });
});

describe('getLastAvailableCalendarDate', () => {
  it('returns the earliest archive date among archived accounts', () => {
    expect(
      getLastAvailableCalendarDate([
        null,
        '2026-03-01T00:00:00.000Z',
        '2026-01-15T00:00:00.000Z',
      ])
    ).toBe('2026-01-15');
  });

  it('returns null when no account is archived', () => {
    expect(getLastAvailableCalendarDate([null, undefined, ''])).toBeNull();
  });
});

describe('validateArchivedAccountAvailability', () => {
  it('accepts active accounts on any date', () => {
    expect(
      validateArchivedAccountAvailability({
        date: '2026-06-01',
        account: { archivedAt: null },
        counterpartAccount: { archivedAt: null },
      })
    ).toEqual({ valid: true, violations: [] });
  });

  it('allows an archived transaction account on its archive date', () => {
    expect(
      validateArchivedAccountAvailability({
        date: '2026-01-15',
        account: { archivedAt: '2026-01-15T12:00:00.000Z' },
      })
    ).toEqual({ valid: true, violations: [] });
  });

  it('rejects activity after the transaction account archive date', () => {
    const result = validateArchivedAccountAvailability({
      date: '2026-01-16',
      account: { archivedAt: '2026-01-15T12:00:00.000Z' },
    });

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual([
      {
        field: 'accountId',
        code: 'activity_after_archive_date',
        message: 'This account cannot receive activity after its archive date.',
      },
    ]);
  });

  it('applies the archive-date rule independently to both slots', () => {
    const result = validateArchivedAccountAvailability({
      date: '2026-02-02',
      account: { archivedAt: '2026-02-01T00:00:00.000Z' },
      counterpartAccount: { archivedAt: '2026-01-15T00:00:00.000Z' },
    });

    expect(result.valid).toBe(false);
    expect(result.violations.map((violation) => violation.field)).toEqual([
      'accountId',
      'counterpartAccountId',
    ]);
  });

  it('rejects only the counterpart when the transaction account is still available', () => {
    const result = validateArchivedAccountAvailability({
      date: '2026-01-16',
      account: { archivedAt: null },
      counterpartAccount: { archivedAt: '2026-01-15T00:00:00.000Z' },
    });

    expect(result.violations).toEqual([
      {
        field: 'counterpartAccountId',
        code: 'activity_after_archive_date',
        message:
          'The counterpart account cannot receive activity after its archive date.',
      },
    ]);
  });
});
