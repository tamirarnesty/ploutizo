import path from 'node:path';
import { devtools } from '@tanstack/devtools-vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import viteReact from '@vitejs/plugin-react';
import {
  offlineShellRevisionSlot,
  stampOfflineShellRevision,
} from './src/pwa/offline-shell-revision';

const noCache = { headers: { 'cache-control': 'no-cache' } };

const config = defineConfig({
  plugins: [
    devtools(),
    nitro({
      // No COOP or COEP. Later OPFS persistence uses OPFSCoopSyncVFS and
      // must not require cross-origin isolation.
      routeRules: {
        '/sw.js': noCache,
        '/manifest.json': noCache,
        '/offline.html': noCache,
      },
    }),
    tailwindcss(),
    tanstackStart({
      pages: [
        {
          path: '/',
          prerender: {
            enabled: true,
            outputPath: '/offline.html',
            crawlLinks: false,
            headers: {
              'X-TSS_SHELL': 'true',
            },
          },
        },
      ],
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoStaticPathsDiscovery: false,
        failOnError: true,
      },
    }),
    viteReact(),
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
          { url: '/offline.html', revision: offlineShellRevisionSlot },
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }).map((plugin) => ({
      ...plugin,
      // Nitro's server build also emits a Vite environment. Generating the
      // worker there rewrites sw.js after Nitro has already recorded its size.
      applyToEnvironment: (environment: { name: string }) =>
        environment.name === 'client',
    })),
    {
      name: 'ploutizo-offline-shell',
      enforce: 'post',
      buildApp: {
        order: 'post',
        async handler() {
          const output = path.join(import.meta.dirname, '.output/public');
          await stampOfflineShellRevision(
            path.join(output, 'sw.js'),
            path.join(output, 'offline.html')
          );
        },
      },
    },
  ],
  optimizeDeps: {
    exclude: ['@clerk/ui'],
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Required for ReUI DataGrid internal imports (uses @ploutizo/components/* alias)
      '@ploutizo/components': path.resolve(
        import.meta.dirname,
        '../../packages/ui/src/components'
      ),
    },
  },
});

export default config;
