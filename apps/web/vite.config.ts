import path from 'node:path';
import { devtools } from '@tanstack/devtools-vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import viteReact from '@vitejs/plugin-react';
import { precacheGlobPatterns } from './src/pwa/precache';

const noCache = { headers: { 'cache-control': 'no-cache' } };

const config = defineConfig({
  plugins: [
    devtools(),
    nitro({
      // No COOP or COEP. Later OPFS persistence uses OPFSCoopSyncVFS and
      // must not require cross-origin isolation.
      routeRules: {
        '/sw.js': noCache,
        '/manifest.webmanifest': noCache,
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
        globPatterns: [...precacheGlobPatterns],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }).map((plugin) => ({
      ...plugin,
      // Nitro's server build also emits a Vite environment. Generating the
      // worker there rewrites sw.js after Nitro has already recorded its size.
      applyToEnvironment: (environment: { name: string }) =>
        environment.name === 'client',
    })),
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
