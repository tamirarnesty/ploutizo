import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';
import {
  assertStampedServiceWorker,
  offlineShellRevisionSlot,
  stampOfflineShellRevision,
} from '../src/pwa/offline-shell-revision';
import { OFFLINE_ENTRY_PATH } from '../src/pwa/offline-entry';
import type { Plugin } from 'vite';

const OFFLINE_SHELL_VIRTUAL = 'virtual:ploutizo-offline-shell-html';

const shellHtmlModule = (html: string | undefined) =>
  `export const offlineShellHtml = ${html === undefined ? 'undefined' : JSON.stringify(html)};`;

export const offlineShellHtmlPlugin = (webRoot: string): Plugin => ({
  name: 'ploutizo-offline-shell-html',
  resolveId(id) {
    if (id === OFFLINE_SHELL_VIRTUAL) return id;
  },
  load(id) {
    if (id !== OFFLINE_SHELL_VIRTUAL) return;

    const shellPath = path.join(webRoot, '.output/public/offline.html');
    if (!existsSync(shellPath)) return shellHtmlModule(undefined);
    return shellHtmlModule(readFileSync(shellPath, 'utf8'));
  },
});

export const offlineShellStampPlugin = (webRoot: string): Plugin => ({
  name: 'ploutizo-offline-shell',
  enforce: 'post',
  buildApp: {
    order: 'post',
    async handler() {
      const output = path.join(webRoot, '.output/public');
      const serviceWorkerPath = path.join(output, 'sw.js');
      await stampOfflineShellRevision(
        serviceWorkerPath,
        path.join(output, 'offline.html')
      );
      await assertStampedServiceWorker(serviceWorkerPath);
    },
  },
});

export const ploutizoPwaPlugins = (webRoot: string): Plugin[] => [
  ...VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src',
    filename: 'sw.ts',
    outDir: '.output/public',
    scope: '/',
    injectRegister: false,
    manifest: false,
    includeManifestIcons: false,
    registerType: 'prompt',
    injectManifest: {
      globPatterns: ['assets/**/*.{js,css,woff,woff2}'],
      additionalManifestEntries: [
        { url: OFFLINE_ENTRY_PATH, revision: offlineShellRevisionSlot },
      ],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    },
  }).map((plugin) => ({
    ...plugin,
    applyToEnvironment: (environment: { name: string }) =>
      environment.name === 'client',
  })),
  offlineShellHtmlPlugin(webRoot),
  offlineShellStampPlugin(webRoot),
];

export const ploutizoPwaNitroRouteRules = () => {
  const noCache = { headers: { 'cache-control': 'no-cache' } };
  return {
    '/sw.js': noCache,
    '/manifest.json': noCache,
    [OFFLINE_ENTRY_PATH]: noCache,
  };
};

export const ploutizoOfflineShellPrerender = () => ({
  path: '/',
  prerender: {
    enabled: true,
    outputPath: OFFLINE_ENTRY_PATH,
    crawlLinks: false,
    headers: {
      'X-TSS_SHELL': 'true',
    },
  },
});

/** Stable sha256 used only in tests when stubbing the offline shell file. */
export const offlineShellFixtureRevision = (html: string) =>
  createHash('sha256').update(html).digest('hex');
