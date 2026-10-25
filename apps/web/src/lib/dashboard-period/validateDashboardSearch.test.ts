import { describe, expect, it } from 'vitest';
import { validateDashboardSearch } from '@/lib/dashboard-period/validateDashboardSearch';

describe('validateDashboardSearch', () => {
  it('keeps the spend trend mode alongside the period', () => {
    expect(validateDashboardSearch({ range: 'ytd', trend: 'running' })).toEqual(
      { range: 'ytd', trend: 'running' }
    );
  });

  it('reads the period and the mode independently', () => {
    expect(validateDashboardSearch({ range: 'nope', trend: 'bucket' })).toEqual(
      { trend: 'bucket' }
    );
    expect(validateDashboardSearch({ range: '6m', trend: 'nope' })).toEqual({
      range: '6m',
    });
  });
});
