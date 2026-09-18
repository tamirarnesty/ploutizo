import { describe, expect, it } from 'vitest';
import { toCalendarDisabled } from './date-picker-disabled';

describe('toCalendarDisabled', () => {
  it('returns undefined when no after constraint is set', () => {
    expect(toCalendarDisabled()).toBeUndefined();
    expect(toCalendarDisabled({})).toBeUndefined();
  });

  it('disables calendar days after the last allowed ISO date', () => {
    expect(toCalendarDisabled({ after: '2026-01-15' })).toEqual({
      after: new Date(2026, 0, 15),
    });
  });

  it('ignores unparseable after dates', () => {
    expect(toCalendarDisabled({ after: 'not-a-date' })).toBeUndefined();
  });
});
