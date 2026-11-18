import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { offlineShellPathFromServerEntry } from './read-offline-entry.server';

describe('offlineShellPathFromServerEntry', () => {
  it('reads the public shell beside the Nitro server directory', () => {
    const serverEntry = path.join('/srv/apps/web/.output/server/index.mjs');
    expect(offlineShellPathFromServerEntry(serverEntry)).toBe(
      path.join('/srv/apps/web/.output/public/offline.html')
    );
  });
});
