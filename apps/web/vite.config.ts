import path from 'node:path';
import { devtools } from '@tanstack/devtools-vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import {
  ploutizoOfflineShellPrerender,
  ploutizoPwaNitroRouteRules,
  ploutizoPwaPlugins,
} from './vite/pwa-build';

const webRoot = import.meta.dirname;

const config = defineConfig({
  plugins: [
    devtools(),
    nitro({
      // No COOP or COEP. OPFS persistence uses OPFSCoopSyncVFS and must not
      // require cross-origin isolation.
      routeRules: ploutizoPwaNitroRouteRules(),
    }),
    tailwindcss(),
    tanstackStart({
      pages: [ploutizoOfflineShellPrerender()],
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoStaticPathsDiscovery: false,
        failOnError: true,
      },
    }),
    viteReact(),
    ...ploutizoPwaPlugins(webRoot),
  ],
  optimizeDeps: {
    exclude: [
      '@clerk/ui',
      // Prebundling rewrites the published OPFS worker URL and breaks wa-sqlite.
      '@tanstack/browser-db-sqlite-persistence',
    ],
  },
  ssr: {
    // The access shell imports the persistence module. Leave the worker out of
    // the server bundle; the database opens only in the browser.
    external: [
      '@tanstack/browser-db-sqlite-persistence',
      '@tanstack/db-sqlite-persistence-core',
      '@journeyapps/wa-sqlite',
    ],
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Required for ReUI DataGrid internal imports (uses @ploutizo/components/* alias)
      '@ploutizo/components': path.resolve(
        webRoot,
        '../../packages/ui/src/components'
      ),
    },
  },
});

export default config;
