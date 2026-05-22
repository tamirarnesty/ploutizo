import { describe, expect, it } from 'vitest';
import {
  buildDashboardSearchFromCalendarSelection,
  buildDashboardSearchFromClosedRange,
  formatDashboardTitle,
  getDefaultDashboardRange,
  isoDate,
  parseSearchToDashboardRange,
  urlSearchMatchesDefaultDashboardPeriod,
} from './dashboardPeriod';

describe('dashboardPeriod', () => {
  const MAY_15_2026_NOON = new Date(2026, 4, 15, 12, 0, 0);

  describe('isoDate', () => {
    it('formats as YYYY-MM-DD in en-CA style', () => {
      expect(isoDate(MAY_15_2026_NOON)).toBe('2026-05-15');
    });
  });

  describe('getDefaultDashboardRange', () => {
    it('returns month start through start of today', () => {
      const { from, to } = getDefaultDashboardRange(MAY_15_2026_NOON);
      expect(from.getDate()).toBe(1);
      expect(from.getMonth()).toBe(4);
      expect(to.getDate()).toBe(15);
      expect(to.getMonth()).toBe(4);
    });
  });

  describe('parseSearchToDashboardRange', () => {
    it('returns default MTD when from and to are missing', () => {
      const { from, to } = parseSearchToDashboardRange(
        undefined,
        undefined,
        MAY_15_2026_NOON
      );
      expect(isoDate(from)).toBe('2026-05-01');
      expect(isoDate(to)).toBe('2026-05-15');
    });

    it('parses explicit from/to strings', () => {
      const { from, to } = parseSearchToDashboardRange(
        '2026-04-01',
        '2026-04-30',
        MAY_15_2026_NOON
      );
      expect(isoDate(from)).toBe('2026-04-01');
      expect(isoDate(to)).toBe('2026-04-30');
    });
  });

  describe('urlSearchMatchesDefaultDashboardPeriod', () => {
    it('is false when either param is missing', () => {
      expect(
        urlSearchMatchesDefaultDashboardPeriod(
          undefined,
          '2026-05-15',
          MAY_15_2026_NOON
        )
      ).toBe(false);
    });

    it('is true for current month-to-date encoded dates', () => {
      const def = getDefaultDashboardRange(MAY_15_2026_NOON);
      expect(
        urlSearchMatchesDefaultDashboardPeriod(
          isoDate(def.from),
          isoDate(def.to),
          MAY_15_2026_NOON
        )
      ).toBe(true);
    });
  });

  describe('buildDashboardSearchFromClosedRange', () => {
    it('clears search when range equals default MTD', () => {
      const def = getDefaultDashboardRange(MAY_15_2026_NOON);
      expect(
        buildDashboardSearchFromClosedRange(def.from, def.to, MAY_15_2026_NOON)
      ).toEqual({ from: undefined, to: undefined });
    });

    it('returns ISO strings for non-default range', () => {
      const from = new Date(2026, 3, 1);
      const to = new Date(2026, 3, 30);
      expect(
        buildDashboardSearchFromClosedRange(from, to, MAY_15_2026_NOON)
      ).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    });
  });

  describe('buildDashboardSearchFromCalendarSelection', () => {
    it('clears search when range has no from', () => {
      expect(
        buildDashboardSearchFromCalendarSelection(undefined, MAY_15_2026_NOON)
      ).toEqual({ from: undefined, to: undefined });
    });

    it('sets only from when to is missing', () => {
      expect(
        buildDashboardSearchFromCalendarSelection(
          { from: new Date(2026, 3, 10), to: undefined },
          MAY_15_2026_NOON
        )
      ).toEqual({ from: '2026-04-10', to: undefined });
    });
  });

  describe('formatDashboardTitle', () => {
    it('includes calendar year for same-month range', () => {
      const from = new Date(2026, 4, 1);
      const to = new Date(2026, 4, 28);
      expect(formatDashboardTitle(from, to)).toMatch(/2026/);
    });

    it('uses a range when months differ within the same year', () => {
      const from = new Date(2026, 0, 1);
      const to = new Date(2026, 2, 31);
      const title = formatDashboardTitle(from, to);
      expect(title).toContain('2026');
      expect(title).toMatch(/–|—|-/);
    });
  });
});
