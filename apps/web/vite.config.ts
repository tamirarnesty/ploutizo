import path from 'node:path';
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';

const config = defineConfig({
  plugins: [nitro(), tailwindcss(), tanstackStart(), viteReact()],
  optimizeDeps: {
    exclude: ['@clerk/ui'],
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Required for ReUI DataGrid internal imports (uses @ploutizo/components/* alias)
      '@ploutizo/components': path.resolve(
        __dirname,
        '../../packages/ui/src/components'
      ),
    },
  },
});

export default config;
