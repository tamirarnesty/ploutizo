import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { offlineEntryCandidates } from './read-offline-entry.server';

describe('offlineEntryCandidates', () => {
  it('covers an app cwd and the monorepo root', () => {
    expect(offlineEntryCandidates('/srv/apps/web')).toEqual([
      path.resolve('/srv/apps/web', '.output/public/offline.html'),
      path.resolve('/srv/apps/web', 'apps/web/.output/public/offline.html'),
    ]);
  });
});
