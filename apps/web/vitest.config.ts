import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import viteReact from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../..');
const uiSrc = path.resolve(workspaceRoot, 'packages/ui/src');
const webSrc = path.resolve(__dirname, 'src');

// Resolve a path stem to an existing file: direct .tsx/.ts, bare file, or index barrel.
const resolveWithTsExtensions = (resolvedBase: string): string | undefined => {
  const candidates = [
    `${resolvedBase}.tsx`,
    `${resolvedBase}.ts`,
    resolvedBase,
    `${resolvedBase}/index.tsx`,
    `${resolvedBase}/index.ts`,
  ];
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // Not a file — try next candidate.
    }
  }
  return undefined;
};

/** Dual-home `@/` aliases: UI package vs web app (`packages/ui/tsconfig` paths). */
const resolveAliasesFromAtSlash = (id: string): string | undefined => {
  if (!id.startsWith('@/')) return undefined;
  const tail = id.slice(2); // '@/lib/utils' -> 'lib/utils'
  return (
    resolveWithTsExtensions(path.resolve(uiSrc, tail)) ??
    resolveWithTsExtensions(path.resolve(webSrc, tail))
  );
};

export default defineConfig({
  plugins: [
    viteReact(),
    // vitest-alias-at-slash-dual-root: for `@/…` imports that include a file path,
    // resolveId → resolveAliasesFromAtSlash tries uiSrc first, then webSrc (dual-root).
    {
      name: 'vitest-alias-at-slash-dual-root',
      enforce: 'pre',
      resolveId(id) {
        return resolveAliasesFromAtSlash(id);
      },
    },
  ],
  // `@/` is resolved only via vitest-alias-at-slash-dual-root (uiSrc, then webSrc).
  // A static `@` → webSrc alias breaks DataGrid imports inside packages/ui.
  resolve: {
    alias: {
      '@ploutizo/components': path.resolve(
        __dirname,
        '../../packages/ui/src/components'
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test/vitest-setup.ts'],
  },
});
