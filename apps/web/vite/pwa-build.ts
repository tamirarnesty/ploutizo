import path from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';
import {
  offlineShellRevisionSlot,
  stampOfflineShellRevision,
} from '../src/pwa/offline-shell-revision';
import { OFFLINE_ENTRY_PATH } from '../src/pwa/offline-entry';
import type { Plugin } from 'vite';

export const offlineShellStampPlugin = (webRoot: string): Plugin => ({
  name: 'ploutizo-offline-shell',
  enforce: 'post',
  buildApp: {
    order: 'post',
    async handler() {
      const output = path.join(webRoot, '.output/public');
      await stampOfflineShellRevision(
        path.join(output, 'sw.js'),
        path.join(output, 'offline.html')
      );
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
    },
  }).map((plugin) => ({
    ...plugin,
    applyToEnvironment: (environment: { name: string }) =>
      environment.name === 'client',
  })),
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
