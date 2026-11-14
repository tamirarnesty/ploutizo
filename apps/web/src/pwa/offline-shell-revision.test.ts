import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  offlineShellRevisionSlot,
  stampOfflineShellRevision,
} from './offline-shell-revision';

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

const tempDir = async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'offline-shell-'));
  directories.push(dir);
  return dir;
};

describe('stampOfflineShellRevision', () => {
  it('keeps the worker the same size and records the shell hash', async () => {
    const dir = await tempDir();
    const shellPath = path.join(dir, 'offline.html');
    const serviceWorkerPath = path.join(dir, 'sw.js');
    const html = '<!doctype html><title>shell</title>';
    const before = `self.__WB_MANIFEST=[{"revision":"${offlineShellRevisionSlot}","url":"/offline.html"}]`;
    await writeFile(shellPath, html);
    await writeFile(serviceWorkerPath, before);

    await stampOfflineShellRevision(serviceWorkerPath, shellPath);

    const after = await readFile(serviceWorkerPath, 'utf8');
    const revision = createHash('sha256').update(html).digest('hex');
    expect(offlineShellRevisionSlot).toHaveLength(revision.length);
    expect(after).toBe(
      `self.__WB_MANIFEST=[{"revision":"${revision}","url":"/offline.html"}]`
    );
    expect(Buffer.byteLength(after)).toBe(Buffer.byteLength(before));
    expect(after).not.toContain(offlineShellRevisionSlot);
  });

  it('fails the build when the shell file is missing', async () => {
    const dir = await tempDir();
    const serviceWorkerPath = path.join(dir, 'sw.js');
    await writeFile(serviceWorkerPath, offlineShellRevisionSlot);

    await expect(
      stampOfflineShellRevision(
        serviceWorkerPath,
        path.join(dir, 'offline.html')
      )
    ).rejects.toThrow(/was not written/);
  });

  it('fails when the worker has no revision slot to stamp', async () => {
    const dir = await tempDir();
    const shellPath = path.join(dir, 'offline.html');
    const serviceWorkerPath = path.join(dir, 'sw.js');
    await writeFile(shellPath, '<!doctype html>');
    await writeFile(serviceWorkerPath, 'self.__WB_MANIFEST=[]');

    await expect(
      stampOfflineShellRevision(serviceWorkerPath, shellPath)
    ).rejects.toThrow(/found 0/);
  });
});
