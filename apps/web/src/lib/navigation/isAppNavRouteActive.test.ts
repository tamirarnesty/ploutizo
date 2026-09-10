import { describe, expect, it } from 'vitest';
import { isAppNavRouteActive } from './isAppNavRouteActive';

describe('isAppNavRouteActive', () => {
  it('matches exact paths and nested routes without sibling overlap', () => {
    expect(isAppNavRouteActive('/import/history', '/import')).toBe(true);
    expect(isAppNavRouteActive('/import/draft_1', '/import')).toBe(true);
    expect(isAppNavRouteActive('/import/draft_1/finalize', '/import')).toBe(
      true
    );
    expect(isAppNavRouteActive('/import/history', '/import/history')).toBe(
      true
    );
    expect(isAppNavRouteActive('/transactions', '/import')).toBe(false);
    expect(isAppNavRouteActive('/settings/categories', '/settings')).toBe(true);
  });
});
