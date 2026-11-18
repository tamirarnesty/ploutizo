import { describe, expect, it } from 'vitest';
import { OFFLINE_ENTRY_PATH } from './offline-entry';
import {
  OFFLINE_RETURN_TO_SEARCH_PARAM,
  resolveOfflineNavigationFallback,
} from './offline-navigation';

describe('resolveOfflineNavigationFallback', () => {
  const origin = 'https://app.example';

  it('serves the shell document for the offline entry path', () => {
    expect(
      resolveOfflineNavigationFallback({
        origin,
        pathname: OFFLINE_ENTRY_PATH,
        search: '',
      })
    ).toEqual({ kind: 'shell' });
  });

  it('redirects in-app navigations to the shell with returnTo', () => {
    const fallback = resolveOfflineNavigationFallback({
      origin,
      pathname: '/dashboard',
      search: '?tab=1',
    });
    expect(fallback).toEqual({
      kind: 'redirect',
      location: `https://app.example${OFFLINE_ENTRY_PATH}?${OFFLINE_RETURN_TO_SEARCH_PARAM}=%2Fdashboard%3Ftab%3D1`,
    });
  });
});
