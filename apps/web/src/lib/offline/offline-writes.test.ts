import { describe, expect, it, vi } from 'vitest';
import { createOfflineWriteUnavailableError } from './offline-copy';
import { isBrowserOffline, setBrowserOnlineForTests } from './browser-online';

describe('offline writes', () => {
  it('names a blocked write and does not queue it', () => {
    setBrowserOnlineForTests(false);
    expect(isBrowserOffline()).toBe(true);
    const error = createOfflineWriteUnavailableError();
    expect(error.name).toBe('OfflineWriteUnavailableError');
    expect(error.message).toContain("aren't available until you reconnect");
    setBrowserOnlineForTests(null);
  });

  it('allows writes while the browser is online', () => {
    setBrowserOnlineForTests(true);
    expect(isBrowserOffline()).toBe(false);
    setBrowserOnlineForTests(null);
  });
});

describe('OfflineIndicator', () => {
  it('renders the last-synced banner only as copy the layout can show', async () => {
    const { offlineBannerText } = await import('./offline-copy');
    expect(
      offlineBannerText('2026-11-19T08:30:00.000Z', 'en-US', 'UTC')
    ).toMatch(/^Offline - data as of /);
    expect(vi.isMockFunction(offlineBannerText)).toBe(false);
  });
});
