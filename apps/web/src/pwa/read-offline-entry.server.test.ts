import { describe, expect, it, vi } from 'vitest';

vi.mock('virtual:ploutizo-offline-shell-html', () => ({
  offlineShellHtml: '<!doctype html><title>offline shell</title>',
}));

describe('readOfflineEntry', () => {
  it('returns the build-embedded offline shell', async () => {
    const { readOfflineEntry } = await import('./read-offline-entry.server');
    await expect(readOfflineEntry()).resolves.toBe(
      '<!doctype html><title>offline shell</title>'
    );
  });
});
