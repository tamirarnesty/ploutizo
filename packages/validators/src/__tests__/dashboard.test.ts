import { describe, expect, it } from 'vitest';
import {
  dashboardSearchFromSelection,
  selectionFromDashboardSearch,
} from '@ploutizo/utils/dashboard-period';
import type { DashboardPeriodSelection } from '@ploutizo/utils/dashboard-period';
import {
  dashboardOverviewQuerySchema,
  dashboardPeriodSearchSchema,
} from '../dashboard';

const selectionFromSearch = (search: Record<string, unknown>) => {
  const parsed = dashboardPeriodSearchSchema.safeParse(search);
  return parsed.success ? selectionFromDashboardSearch(parsed.data) : null;
};

describe('dashboardPeriodSearchSchema', () => {
  it.each<DashboardPeriodSelection>([
    { kind: 'shortcut', shortcut: 'mtd' },
    { kind: 'shortcut', shortcut: 'all' },
    { kind: 'custom', from: '2026-01-01', to: '2026-01-31' },
    { kind: 'custom', from: '2026-01-01', to: '2026-01-01' },
  ])('round-trips %o through search params', (selection) => {
    expect(
      selectionFromSearch(dashboardSearchFromSelection(selection))
    ).toEqual(selection);
  });

  it.each([
    [
      'mixed shortcut and custom',
      { range: 'mtd', from: '2026-01-01', to: '2026-01-31' },
    ],
    ['an unknown shortcut', { range: 'bad' }],
    ['an impossible date', { from: '2026-13-01', to: '2026-01-31' }],
    ['a reversed range', { from: '2026-02-10', to: '2026-02-01' }],
    ['a half range', { from: '2026-01-01' }],
    ['nothing', {}],
  ])('rejects %s', (_label, search) => {
    expect(selectionFromSearch(search)).toBeNull();
  });
});

describe('dashboardOverviewQuerySchema', () => {
  it('reads no params as All', () => {
    expect(dashboardOverviewQuerySchema.parse({})).toEqual({ kind: 'all' });
  });

  it('reads a from–to range', () => {
    expect(
      dashboardOverviewQuerySchema.parse({
        from: '2026-03-01',
        to: '2026-03-15',
      })
    ).toEqual({ kind: 'ranged', from: '2026-03-01', to: '2026-03-15' });
  });

  it.each([
    { from: '2026-03-01' },
    { from: '2026-03-15', to: '2026-03-01' },
    { from: '2026-03-01', to: '2026-03-15', bucket: 'day' },
  ])('rejects %o', (query) => {
    expect(dashboardOverviewQuerySchema.safeParse(query).success).toBe(false);
  });
});
