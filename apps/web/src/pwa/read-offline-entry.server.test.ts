import { describe, expect, it } from 'vitest';
import { offlineEntryPathFrom } from './read-offline-entry.server';

describe('offlineEntryPathFrom', () => {
  it('resolves public/offline.html from the server bundle', () => {
    expect(
      offlineEntryPathFrom(
        'file:///srv/apps/web/.output/server/_ssr/router.mjs'
      )
    ).toBe('/srv/apps/web/.output/public/offline.html');
  });
});
