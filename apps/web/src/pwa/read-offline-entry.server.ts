import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** `.output/server/index.mjs` → `.output/public/offline.html`. */
export const offlineShellPathFromServerEntry = (serverEntry: string) =>
  path.resolve(path.dirname(serverEntry), '../public/offline.html');

export const readOfflineEntry = () =>
  readFile(offlineShellPathFromServerEntry(process.argv[1]), 'utf8');
