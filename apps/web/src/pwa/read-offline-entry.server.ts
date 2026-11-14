import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The route is bundled to `.output/server/_ssr/`, so the shell is two levels up.
export const offlineEntryPathFrom = (moduleUrl: string | URL) =>
  fileURLToPath(new URL('../../public/offline.html', moduleUrl));

export const readOfflineEntry = async () => {
  try {
    return await readFile(offlineEntryPathFrom(import.meta.url), 'utf8');
  } catch (error) {
    if (!isMissingFile(error)) throw error;
    return undefined;
  }
};

const isMissingFile = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'ENOENT';
