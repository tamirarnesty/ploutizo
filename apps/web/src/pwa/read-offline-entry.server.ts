import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const offlineEntryCandidates = (cwd: string) => [
  path.resolve(cwd, '.output/public/offline.html'),
  path.resolve(cwd, 'apps/web/.output/public/offline.html'),
];

export const readOfflineEntry = async () => {
  for (const candidate of offlineEntryCandidates(process.cwd())) {
    try {
      return await readFile(candidate, 'utf8');
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
  }

  return undefined;
};

const isMissingFile = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'ENOENT';
