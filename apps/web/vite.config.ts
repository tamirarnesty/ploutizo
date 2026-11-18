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
      // No COOP or COEP. Later OPFS persistence uses OPFSCoopSyncVFS and
      // must not require cross-origin isolation.
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
    exclude: ['@clerk/ui'],
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
