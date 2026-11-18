import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { isMissingFile } from '../node/is-missing-file';
import { OFFLINE_ENTRY_PATH } from './offline-entry';

/**
 * Fixed-width stand-in written into `sw.js` before Nitro records its size.
 * The post-build stamp replaces it with the sha256 of `/offline.html`.
 * Same length, so the recorded Content-Length still matches the file.
 */
export const offlineShellRevisionSlot =
  'ploutizo-offline-shell-revision-placeholder-00000000000000000000';

export const stampOfflineShellRevision = async (
  serviceWorkerPath: string,
  shellPath: string
) => {
  const shell = await readFile(shellPath).catch((error: unknown) => {
    if (isMissingFile(error)) {
      throw new Error(
        `Offline shell was not written to ${shellPath}. Start's prerender queue still resolves when a page fails.`,
        { cause: error }
      );
    }
    throw error;
  });
  if (shell.byteLength === 0) {
    throw new Error(`Offline shell is empty: ${shellPath}`);
  }

  const revision = createHash('sha256').update(shell).digest('hex');
  if (revision.length !== offlineShellRevisionSlot.length) {
    throw new Error(
      'Offline shell revision length does not match the precache slot'
    );
  }

  const worker = await readFile(serviceWorkerPath);
  const slot = Buffer.from(offlineShellRevisionSlot);
  const hits = countOccurrences(worker, slot);
  if (hits !== 1) {
    throw new Error(
      `Expected one offline shell revision slot in ${serviceWorkerPath}, found ${hits}`
    );
  }

  const stamped = replaceOnce(worker, slot, Buffer.from(revision));
  if (stamped.byteLength !== worker.byteLength) {
    throw new Error(
      'Stamping the offline shell changed the service worker size'
    );
  }
  await writeFile(serviceWorkerPath, stamped);
};

const countOccurrences = (buffer: Buffer, needle: Buffer) => {
  let count = 0;
  let from = 0;
  while (from <= buffer.length - needle.length) {
    const found = buffer.indexOf(needle, from);
    if (found === -1) break;
    count += 1;
    from = found + needle.length;
  }
  return count;
};

const replaceOnce = (buffer: Buffer, needle: Buffer, replacement: Buffer) => {
  const found = buffer.indexOf(needle);
  return Buffer.concat([
    buffer.subarray(0, found),
    replacement,
    buffer.subarray(found + needle.length),
  ]);
};

const revisionPattern = /[a-f0-9]{64}/;

export const assertStampedServiceWorker = async (serviceWorkerPath: string) => {
  const worker = await readFile(serviceWorkerPath, 'utf8');
  if (worker.includes(offlineShellRevisionSlot)) {
    throw new Error(
      `Service worker still contains the offline shell revision placeholder: ${serviceWorkerPath}`
    );
  }
  if (!worker.includes(OFFLINE_ENTRY_PATH)) {
    throw new Error(
      `Service worker does not precache ${OFFLINE_ENTRY_PATH}: ${serviceWorkerPath}`
    );
  }
  const entry = `"url":"${OFFLINE_ENTRY_PATH}"`;
  const index = worker.indexOf(entry);
  if (index === -1) {
    throw new Error(
      `Missing precache manifest entry for ${OFFLINE_ENTRY_PATH}`
    );
  }
  const slice = worker.slice(Math.max(0, index - 120), index + entry.length);
  if (!revisionPattern.test(slice)) {
    throw new Error(
      `Offline shell precache revision is not a sha256 hex next to ${OFFLINE_ENTRY_PATH}`
    );
  }
};
